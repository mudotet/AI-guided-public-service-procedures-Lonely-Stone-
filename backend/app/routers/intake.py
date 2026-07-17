import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    PrecheckResult,
    Procedure,
    SessionFormData,
    SessionMessage,
    UserSession,
)
from app.schemas import (
    IntakeMessageRequest,
    IntakeMessageResponse,
    MessageResponse,
    PrecheckIssue,
    SessionCreate,
    SessionDetail,
    SessionResponse,
)
from app.services.case_classifier import classify_case, merged_case_codes, replace_session_cases
from app.services.openai_client import OpenAIClient
from app.services.session_service import case_summaries, session_response, trusted_context

router = APIRouter(tags=["sessions", "intake"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)) -> SessionResponse:
    procedure = db.scalar(select(Procedure).where(Procedure.code == payload.procedure_code))
    if not procedure:
        raise HTTPException(status_code=404, detail="Không tìm thấy thủ tục")
    session = UserSession(procedure_id=procedure.id, status="intake")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_response(db, session)


@router.post("/intake/message", response_model=IntakeMessageResponse)
def intake_message(payload: IntakeMessageRequest, db: Session = Depends(get_db)) -> IntakeMessageResponse:
    session = db.get(UserSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY chưa được cấu hình")

    db.add(SessionMessage(session_id=session.id, role="user", content=payload.message))
    db.flush()
    messages = list(
        db.scalars(
            select(SessionMessage)
            .where(SessionMessage.session_id == session.id)
            .order_by(SessionMessage.created_at.desc(), SessionMessage.id.desc())
            .limit(12)
        )
    )[::-1]
    history = [{"role": message.role, "content": message.content} for message in messages]

    try:
        classification = classify_case(history)
        stored_form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
        if not stored_form:
            stored_form = SessionFormData(session_id=session.id, data={})
            db.add(stored_form)
        stored_form.data = {**stored_form.data, **classification.facts.non_null()}
        replace_session_cases(db, session, merged_case_codes(classification, stored_form.data))
        session.status = "checklist" if session.case_id else "intake"
        context = (
            f"{trusted_context(db, session)}\n"
            f"Dữ kiện đã trích: {classification.facts.model_dump_json(exclude_none=True)}\n"
            f"Trường còn thiếu: {', '.join(classification.missing_fields) or 'không có'}."
        )
        reply = OpenAIClient().converse(history, context)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="Không thể xử lý yêu cầu AI lúc này") from exc

    db.add(SessionMessage(session_id=session.id, role="assistant", content=reply))
    db.commit()
    db.refresh(session)
    cases = case_summaries(db, session.id)
    return IntakeMessageResponse(
        session=session_response(db, session),
        reply=reply,
        missing_fields=classification.missing_fields,
        confidence=classification.confidence,
        needs_officer_confirmation=(
            any(case.requires_officer_confirmation for case in cases)
            or (classification.needs_officer_confirmation and not cases)
        ),
    )


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> SessionDetail:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    summary = session_response(db, session)
    messages = list(
        db.scalars(
            select(SessionMessage)
            .where(SessionMessage.session_id == session.id)
            .order_by(SessionMessage.created_at, SessionMessage.id)
        )
    )
    form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
    results = list(
        db.scalars(
            select(PrecheckResult)
            .where(PrecheckResult.session_id == session.id)
            .order_by(PrecheckResult.created_at, PrecheckResult.id)
        )
    )
    return SessionDetail(
        **summary.model_dump(),
        messages=[MessageResponse.model_validate(message) for message in messages],
        form_data=form.data if form else {},
        precheck_results=[PrecheckIssue.model_validate(result) for result in results],
    )
