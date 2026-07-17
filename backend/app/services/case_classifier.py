from collections.abc import Sequence
from datetime import date
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import ProcedureCase, SessionCase, UserSession
from app.schemas import CaseClassification
from app.services.openai_client import OpenAIClient
from app.services.rule_engine import detect_case_codes


CLASSIFIER_PROMPT = """Bạn phân loại hồ sơ đăng ký khai sinh tại Việt Nam.
Chỉ dùng các code: standard, out_of_wedlock, overdue, foreign_element, abandoned,
surrogacy, reregistration, correction. Các case có thể đồng thời xảy ra.
- Không hỏi người dùng có quá hạn không: trích ngày sinh/ngày đăng ký để backend tự tính.
- Chỉ điền facts được nói rõ; dữ kiện chưa biết phải là null.
- standard chỉ khi đã rõ: cha mẹ kết hôn, trẻ sinh tại Việt Nam, trong 60 ngày, không có yếu tố nước ngoài/case hiếm.
- Thiếu trường thông thường chỉ đưa vào missing_fields, không bật needs_officer_confirmation.
- Chỉ bật needs_officer_confirmation cho case hiếm, dữ kiện mâu thuẫn hoặc tình huống ngoài taxonomy
  mà không thể làm rõ bằng một câu hỏi tiếp theo.
- Không đưa ra lời khuyên hay căn cứ pháp lý; nhiệm vụ chỉ là trích dữ kiện và phân loại.
"""


def classify_case(history: Sequence[dict[str, str]]) -> CaseClassification:
    return OpenAIClient().classify([{"role": "system", "content": CLASSIFIER_PROMPT}, *history])


def merged_case_codes(classification: CaseClassification, form_data: dict[str, Any]) -> tuple[str, ...]:
    deterministic = detect_case_codes(form_data, date.today()).codes
    model_codes = classification.case_codes if classification.confidence >= 0.75 else []
    return tuple(dict.fromkeys([*deterministic, *model_codes]))


def replace_session_cases(db: Session, session: UserSession, case_codes: Sequence[str]) -> None:
    """The only application write path for case assignment; sessions.case_id is DB-maintained."""
    cases = list(
        db.scalars(
            select(ProcedureCase).where(
                ProcedureCase.procedure_id == session.procedure_id,
                ProcedureCase.code.in_(set(case_codes)),
            )
        )
    )
    db.execute(delete(SessionCase).where(SessionCase.session_id == session.id))
    if not cases:
        db.flush()
        return
    primary = max(cases, key=lambda item: item.display_priority)
    for case in cases:
        db.add(SessionCase(session_id=session.id, case_id=case.id, is_primary=case.id == primary.id))
    db.flush()
    db.refresh(session)
