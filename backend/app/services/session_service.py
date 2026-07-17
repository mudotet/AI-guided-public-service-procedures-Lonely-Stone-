import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import (
    PrecheckResult,
    Procedure,
    ProcedureCase,
    ProcedureQuestion,
    RequiredDocument,
    SessionFormData,
    SessionCase,
    SessionMessage,
    UserSession,
)
from app.schemas import CaseSummary, MessageResponse, PrecheckIssue, SessionDetail, SessionResponse


def case_summaries(db: Session, session_id: uuid.UUID) -> list[CaseSummary]:
    rows = db.execute(
        select(ProcedureCase, SessionCase.is_primary)
        .join(SessionCase, SessionCase.case_id == ProcedureCase.id)
        .where(SessionCase.session_id == session_id)
        .order_by(SessionCase.is_primary.desc(), ProcedureCase.display_priority.desc())
    ).all()
    return [
        CaseSummary(
            code=case.code,
            name=case.name,
            is_primary=is_primary,
            requires_officer_confirmation=case.requires_officer_confirmation,
        )
        for case, is_primary in rows
    ]


def session_response(db: Session, session: UserSession) -> SessionResponse:
    cases = case_summaries(db, session.id)
    return SessionResponse(
        id=session.id,
        procedure_id=session.procedure_id,
        status=session.status,
        primary_case=next((case for case in cases if case.is_primary), None),
        cases=cases,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


def session_detail(db: Session, session: UserSession) -> SessionDetail:
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


def trusted_context(db: Session, session: UserSession) -> str:
    procedure = db.get(Procedure, session.procedure_id)
    case_rows = db.execute(
        select(ProcedureCase)
        .join(SessionCase, SessionCase.case_id == ProcedureCase.id)
        .where(SessionCase.session_id == session.id)
    ).scalars()
    documents = db.execute(
        select(RequiredDocument).where(
            RequiredDocument.procedure_id == session.procedure_id,
            or_(
                RequiredDocument.case_id.is_(None),
                RequiredDocument.case_id.in_(
                    select(SessionCase.case_id).where(SessionCase.session_id == session.id)
                ),
            ),
        )
    ).scalars()
    questions = db.execute(
        select(ProcedureQuestion).where(
            ProcedureQuestion.procedure_id == session.procedure_id,
            or_(
                ProcedureQuestion.case_id.is_(None),
                ProcedureQuestion.case_id.in_(
                    select(SessionCase.case_id).where(SessionCase.session_id == session.id)
                ),
            ),
        ).order_by(ProcedureQuestion.question_order)
    ).scalars()
    parts = [f"Thủ tục: {procedure.name}.", f"Căn cứ đã kiểm chứng: {procedure.legal_basis}."]
    parts.extend(f"Case {case.name}: {case.description or case.name}." for case in case_rows)
    parts.extend(f"Giấy tờ: {doc.name}. Căn cứ: {doc.legal_basis}." for doc in documents)
    parts.extend(f"Câu hỏi làm rõ cho {question.field_name}: {question.question}" for question in questions)
    return "\n".join(parts)
