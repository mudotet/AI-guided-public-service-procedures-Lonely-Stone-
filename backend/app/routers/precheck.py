from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    PrecheckResult,
    SessionCase,
    SessionFormData,
    UserSession,
    ValidationRule,
)
from app.schemas import PrecheckIssue, PrecheckRequest, PrecheckResponse
from app.services.case_classifier import replace_session_cases
from app.services.openai_client import get_openai_client
from app.services.rule_engine import RuleDefinition, ValidationIssue, detect_case_codes, run_rules
from app.services.session_service import case_summaries, trusted_context

router = APIRouter(tags=["precheck"])


def _rule_definition(rule: ValidationRule) -> RuleDefinition:
    return RuleDefinition(
        id=rule.id,
        code=rule.code,
        target_fields=tuple(rule.target_fields),
        rule_type=rule.rule_type,
        rule_value=rule.rule_value,
        error_message=rule.error_message,
        suggested_fix=rule.suggested_fix,
        severity=rule.severity,
        legal_basis=rule.legal_basis,
    )


@router.post("/precheck", response_model=PrecheckResponse)
def precheck(payload: PrecheckRequest, db: Session = Depends(get_db)) -> PrecheckResponse:
    session = db.get(UserSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc")

    stored_form = db.scalar(select(SessionFormData).where(SessionFormData.session_id == session.id))
    if not stored_form:
        stored_form = SessionFormData(session_id=session.id, data=payload.form_data)
        db.add(stored_form)
    else:
        stored_form.data = payload.form_data

    detection = detect_case_codes(payload.form_data)
    existing_codes = [case.code for case in case_summaries(db, session.id)]
    replace_session_cases(db, session, detection.codes or existing_codes)
    case_ids = list(db.scalars(select(SessionCase.case_id).where(SessionCase.session_id == session.id)))
    rules = list(
        db.scalars(
            select(ValidationRule).where(
                ValidationRule.procedure_id == session.procedure_id,
                ValidationRule.enabled.is_(True),
                or_(ValidationRule.case_id.is_(None), ValidationRule.case_id.in_(case_ids)),
            )
        )
    )
    issues = run_rules(payload.form_data, map(_rule_definition, rules))

    assigned_cases = case_summaries(db, session.id)
    needs_officer = detection.requires_officer_confirmation or any(
        case.requires_officer_confirmation for case in assigned_cases
    )
    if settings.openai_api_key and (needs_officer or not case_ids):
        try:
            concerns = get_openai_client().review_exception(payload.form_data, trusted_context(db, session))
            for concern in concerns.items:
                message = concern.message
                if "Cần cán bộ hộ tịch xác nhận trực tiếp" not in message:
                    message = f"{message} Cần cán bộ hộ tịch xác nhận trực tiếp."
                issues.append(
                    ValidationIssue(
                        rule_code="llm_exception_review",
                        field_name=concern.field_name,
                        message=message,
                        suggested_fix=concern.suggested_fix,
                        legal_basis=None,
                        severity="warning",
                        source="llm",
                    )
                )
            needs_officer = needs_officer or bool(concerns.items)
        except Exception:
            needs_officer = True

    db.execute(delete(PrecheckResult).where(PrecheckResult.session_id == session.id))
    saved: list[PrecheckResult] = []
    for issue in issues:
        result = PrecheckResult(
            session_id=session.id,
            field_name=issue.field_name,
            rule_id=issue.rule_id,
            message=issue.message,
            suggested_fix=issue.suggested_fix,
            legal_basis=issue.legal_basis,
            source=issue.source,
            severity=issue.severity,
        )
        db.add(result)
        saved.append(result)
    has_errors = any(issue.severity == "error" for issue in issues)
    session.status = "ready" if not has_errors and not needs_officer else "precheck"
    db.commit()
    for result in saved:
        db.refresh(result)
    return PrecheckResponse(
        session_id=session.id,
        status=session.status,
        issues=[PrecheckIssue.model_validate(result) for result in saved],
        needs_officer_confirmation=needs_officer,
    )
