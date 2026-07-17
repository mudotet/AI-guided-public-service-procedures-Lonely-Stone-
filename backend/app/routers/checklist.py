import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ProcedureCase, ProcedureStep, RequiredDocument, SessionCase, UserSession
from app.schemas import ChecklistResponse, ChecklistStep
from app.services.checklist_builder import deduplicate_documents
from app.services.session_service import case_summaries

router = APIRouter(prefix="/checklist", tags=["checklist"])


@router.get("/{session_id}", response_model=ChecklistResponse)
def get_checklist(session_id: uuid.UUID, db: Session = Depends(get_db)) -> ChecklistResponse:
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")
    case_ids = list(db.scalars(select(SessionCase.case_id).where(SessionCase.session_id == session.id)))
    if not case_ids:
        raise HTTPException(status_code=409, detail="Chưa đủ thông tin để xác định trường hợp")

    documents = list(
        db.scalars(
            select(RequiredDocument)
            .where(
                RequiredDocument.procedure_id == session.procedure_id,
                or_(RequiredDocument.case_id.is_(None), RequiredDocument.case_id.in_(case_ids)),
            )
            .order_by(RequiredDocument.id)
        )
    )
    step_rows = db.execute(
        select(ProcedureStep, ProcedureCase.code)
        .outerjoin(ProcedureCase, ProcedureCase.id == ProcedureStep.case_id)
        .where(
            ProcedureStep.procedure_id == session.procedure_id,
            or_(ProcedureStep.case_id.is_(None), ProcedureStep.case_id.in_(case_ids)),
        )
        .order_by(ProcedureStep.step_order, ProcedureStep.id)
    ).all()
    cases = case_summaries(db, session.id)
    return ChecklistResponse(
        session_id=session.id,
        primary_case=next((case for case in cases if case.is_primary), None),
        cases=cases,
        documents=deduplicate_documents(documents),
        steps=[
            ChecklistStep(
                order=step.step_order,
                title=step.title,
                description=step.description,
                legal_basis=step.legal_basis,
                case_code=case_code,
            )
            for step, case_code in step_rows
        ],
        needs_officer_confirmation=any(case.requires_officer_confirmation for case in cases),
    )

