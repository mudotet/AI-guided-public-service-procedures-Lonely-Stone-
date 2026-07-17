import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    Procedure,
    SessionFormData,
    SessionMessage,
    UserSession,
)
from app.schemas import (
    AudioTranscriptionResponse,
    IntakeMessageRequest,
    IntakeMessageResponse,
    SessionCreate,
    SessionDetail,
    SessionResponse,
)
from app.services.case_classifier import classify_case, merged_case_codes, replace_session_cases
from app.services.openai_client import OpenAIClient
from app.services.pdf_generator import build_birth_registration_pdf
from app.services.session_service import case_summaries, session_detail, session_response, trusted_context

router = APIRouter(tags=["sessions", "intake"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a",
    "audio/x-wav": "wav",
}


def validate_audio(content_type: str | None, audio: bytes) -> tuple[str, str]:
    normalized_type = (content_type or "").split(";", 1)[0].strip().lower()
    extension = SUPPORTED_AUDIO_TYPES.get(normalized_type)
    if not extension:
        raise HTTPException(
            status_code=415,
            detail="Định dạng ghi âm chưa được hỗ trợ. Hãy dùng WebM, M4A, MP3 hoặc WAV.",
        )
    if not audio:
        raise HTTPException(status_code=422, detail="Đoạn ghi âm đang trống. Vui lòng thu âm lại.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Đoạn ghi âm quá lớn. Vui lòng ghi tối đa 90 giây.")
    return normalized_type, extension


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


@router.post("/intake/audio", response_model=AudioTranscriptionResponse)
def transcribe_audio(
    session_id: uuid.UUID = Form(...),
    audio: UploadFile = File(..., description="Đoạn ghi âm WebM, M4A, MP3 hoặc WAV; tối đa 10 MB"),
    db: Session = Depends(get_db),
) -> AudioTranscriptionResponse:
    if not db.get(UserSession, session_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY chưa được cấu hình")

    try:
        audio_bytes = audio.file.read(MAX_AUDIO_BYTES + 1)
    finally:
        audio.file.close()
    content_type, extension = validate_audio(audio.content_type, audio_bytes)

    try:
        transcript = OpenAIClient().transcribe(
            filename=f"recording.{extension}",
            audio=audio_bytes,
            content_type=content_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Không thể chuyển giọng nói thành văn bản lúc này") from exc
    return AudioTranscriptionResponse(transcript=transcript)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> SessionDetail:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    return session_detail(db, session)


@router.get("/sessions/{session_id}/birth-registration.pdf", response_class=Response)
def get_birth_registration_pdf(
    session_id: uuid.UUID,
    download: bool = False,
    db: Session = Depends(get_db),
) -> Response:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
    if not form:
        raise HTTPException(status_code=409, detail="Chưa có thông tin biểu mẫu để tạo PDF")

    disposition = "attachment" if download else "inline"
    return Response(
        content=build_birth_registration_pdf(form.data, str(session.id)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="birth-registration-{session.id}.pdf"'},
    )
