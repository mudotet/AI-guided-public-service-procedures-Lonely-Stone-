import secrets
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import String, cast, delete, func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    PrecheckResult,
    ProcedureCase,
    SessionCase,
    SessionFormData,
    SessionMessage,
    UserSession,
)
from app.schemas import (
    AdminCaseStat,
    AdminDashboardResponse,
    AdminSessionUpdate,
    AdminSessionSummary,
    AdminStats,
    SessionDetail,
)
from app.services.case_classifier import replace_session_cases
from app.services.pdf_generator import build_birth_registration_pdf
from app.services.rule_engine import detect_case_codes
from app.services.session_service import case_summaries, session_detail

router = APIRouter(prefix="/admin", tags=["admin"])
bearer = HTTPBearer(auto_error=False)


def pagination(total: int, requested_page: int, page_size: int) -> tuple[int, int, int]:
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(requested_page, total_pages)
    return page, total_pages, (page - 1) * page_size


def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    if not settings.admin_api_key:
        raise HTTPException(status_code=503, detail="ADMIN_API_KEY chưa được cấu hình ở backend")
    if not credentials or credentials.scheme.lower() != "bearer" or not secrets.compare_digest(
        credentials.credentials, settings.admin_api_key
    ):
        raise HTTPException(
            status_code=401,
            detail="Mã truy cập quản trị không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/dashboard", response_model=AdminDashboardResponse, dependencies=[Depends(require_admin)])
def get_dashboard(
    status_filter: Literal["intake", "checklist", "precheck", "ready"] | None = Query(None, alias="status"),
    case_code: str | None = Query(None, max_length=80),
    q: str | None = Query(None, max_length=120),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    status_counts = dict(db.execute(select(UserSession.status, func.count()).group_by(UserSession.status)).all())
    officer_total = db.scalar(
        select(func.count(func.distinct(SessionCase.session_id)))
        .join(ProcedureCase, ProcedureCase.id == SessionCase.case_id)
        .where(ProcedureCase.requires_officer_confirmation.is_(True))
    ) or 0
    stats = AdminStats(
        total=sum(status_counts.values()),
        intake=status_counts.get("intake", 0),
        checklist=status_counts.get("checklist", 0),
        precheck=status_counts.get("precheck", 0),
        ready=status_counts.get("ready", 0),
        needs_officer_confirmation=officer_total,
    )

    case_rows = db.execute(
        select(
            ProcedureCase.code,
            ProcedureCase.name,
            ProcedureCase.description,
            ProcedureCase.requires_officer_confirmation,
            func.count(SessionCase.session_id),
        )
        .outerjoin(SessionCase, SessionCase.case_id == ProcedureCase.id)
        .group_by(ProcedureCase.id)
        .order_by(func.count(SessionCase.session_id).desc(), ProcedureCase.display_priority.desc())
    ).all()
    case_stats = [
        AdminCaseStat(
            code=code,
            name=name,
            description=description,
            requires_officer_confirmation=requires_officer,
            total=total,
        )
        for code, name, description, requires_officer, total in case_rows
    ]

    query = select(UserSession)
    if status_filter:
        query = query.where(UserSession.status == status_filter)
    if case_code:
        query = query.where(
            UserSession.id.in_(
                select(SessionCase.session_id)
                .join(ProcedureCase, ProcedureCase.id == SessionCase.case_id)
                .where(ProcedureCase.code == case_code)
            )
        )
    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                cast(UserSession.id, String).ilike(search),
                UserSession.id.in_(
                    select(SessionMessage.session_id).where(
                        SessionMessage.role == "user",
                        SessionMessage.content.ilike(search),
                    )
                ),
            )
        )

    result_count = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    page, total_pages, offset = pagination(result_count, page, page_size)
    sessions = list(
        db.scalars(
            query.order_by(UserSession.updated_at.desc()).offset(offset).limit(page_size)
        )
    )
    summaries: list[AdminSessionSummary] = []
    for session in sessions:
        cases = case_summaries(db, session.id)
        last_question = db.scalar(
            select(SessionMessage.content)
            .where(SessionMessage.session_id == session.id, SessionMessage.role == "user")
            .order_by(SessionMessage.created_at.desc(), SessionMessage.id.desc())
            .limit(1)
        )
        summaries.append(
            AdminSessionSummary(
                id=session.id,
                status=session.status,
                primary_case=next((case for case in cases if case.is_primary), None),
                cases=cases,
                needs_officer_confirmation=any(case.requires_officer_confirmation for case in cases),
                last_user_message=last_question,
                created_at=session.created_at,
                updated_at=session.updated_at,
            )
        )
    return AdminDashboardResponse(
        stats=stats,
        case_stats=case_stats,
        sessions=summaries,
        result_count=result_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/sessions/{session_id}", response_model=SessionDetail, dependencies=[Depends(require_admin)])
def get_admin_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> SessionDetail:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    return session_detail(db, session)


@router.patch("/sessions/{session_id}", response_model=SessionDetail, dependencies=[Depends(require_admin)])
def update_admin_session(
    session_id: uuid.UUID,
    payload: AdminSessionUpdate,
    db: Session = Depends(get_db),
) -> SessionDetail:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")

    stored_form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
    if stored_form:
        stored_form.data = payload.form_data
    else:
        db.add(SessionFormData(session_id=session.id, data=payload.form_data))

    detection = detect_case_codes(payload.form_data)
    replace_session_cases(db, session, detection.codes)
    db.execute(delete(PrecheckResult).where(PrecheckResult.session_id == session.id))
    session.status = "precheck" if payload.form_data else "intake"
    db.commit()
    db.refresh(session)
    return session_detail(db, session)


@router.get(
    "/sessions/{session_id}/birth-registration.pdf",
    response_class=Response,
    dependencies=[Depends(require_admin)],
)
def get_admin_birth_registration_pdf(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Response:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
    if not form or not form.data:
        raise HTTPException(status_code=409, detail="Phiên chưa có thông tin để tạo bản xem trước PDF")
    return Response(
        content=build_birth_registration_pdf(form.data, str(session.id)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="birth-registration-{session.id}.pdf"'},
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_admin)],
)
def delete_admin_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    db.delete(session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
