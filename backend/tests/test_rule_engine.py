from datetime import date
from types import SimpleNamespace

import pytest

from app.services.checklist_builder import deduplicate_documents
from app.services.rule_engine import RuleDefinition, detect_case_codes, run_rules


def test_standard_case_accepts_exactly_sixty_days() -> None:
    result = detect_case_codes(
        {
            "child_birth_date": "2026-05-18",
            "registration_date": "2026-07-17",
            "child_birth_country": "VN",
            "parents_married": True,
            "father_nationality": "Việt Nam",
            "mother_nationality": "Việt Nam",
        }
    )
    assert result.days_since_birth == 60
    assert result.codes == ("standard",)


def test_out_of_wedlock_requires_parentage_evidence_when_father_is_requested() -> None:
    assert "out_of_wedlock" in detect_case_codes({"parents_married": False}).codes
    rules = [
        RuleDefinition(
            code="father_name",
            target_fields=("father_full_name",),
            rule_type="required_when",
            rule_value={"field": "wants_father_on_certificate", "equals": True},
            error_message="Thiếu tên cha",
            suggested_fix="Điền tên cha",
            legal_basis="TTHC 1.000689",
        ),
        RuleDefinition(
            code="parentage_evidence",
            target_fields=("parentage_evidence",),
            rule_type="must_be_true_when",
            rule_value={"field": "wants_father_on_certificate", "equals": True},
            error_message="Thiếu chứng cứ",
            suggested_fix="Chuẩn bị chứng cứ",
            legal_basis="TTHC 1.000689",
        ),
    ]
    issues = run_rules({"wants_father_on_certificate": True, "parentage_evidence": False}, rules)
    assert {issue.rule_code for issue in issues} == {"father_name", "parentage_evidence"}


def test_overdue_is_computed_at_day_sixty_one() -> None:
    result = detect_case_codes(
        {"child_birth_date": "2026-05-17", "registration_date": "2026-07-17"}
    )
    assert result.days_since_birth == 61
    assert "overdue" in result.codes


def test_invalid_registration_date_is_not_used_to_classify_overdue() -> None:
    result = detect_case_codes(
        {"child_birth_date": "2026-01-01", "registration_date": "17/07/2026"},
        today=date(2026, 7, 17),
    )
    assert result.days_since_birth is None
    assert "overdue" not in result.codes


def test_foreign_case_detected_from_parent_or_birth_country() -> None:
    result = detect_case_codes(
        {
            "child_birth_date": "2026-07-01",
            "child_birth_country": "France",
            "parents_married": True,
            "mother_nationality": "Việt Nam",
        },
        today=date(2026, 7, 17),
    )
    assert "foreign_element" in result.codes
    assert "standard" not in result.codes


@pytest.mark.parametrize("rare_case", ["abandoned", "surrogacy", "reregistration", "correction"])
def test_each_rare_case_is_detected_and_requires_officer(rare_case: str) -> None:
    result = detect_case_codes({"rare_case": rare_case})
    assert rare_case in result.codes
    assert result.requires_officer_confirmation is True


def test_overlapping_cases_are_all_retained() -> None:
    result = detect_case_codes(
        {
            "child_birth_date": "2026-01-01",
            "registration_date": "2026-07-17",
            "child_birth_country": "US",
            "parents_married": False,
        }
    )
    assert set(result.codes) == {"out_of_wedlock", "overdue", "foreign_element"}


def test_future_birth_date_is_a_deterministic_error() -> None:
    rule = RuleDefinition(
        code="birth_date_valid",
        target_fields=("child_birth_date",),
        rule_type="date_not_future",
        rule_value={},
        error_message="Ngày sinh không hợp lệ",
        suggested_fix="Kiểm tra ngày sinh",
        legal_basis="Luật Hộ tịch 2014",
    )
    issues = run_rules(
        {"child_birth_date": "2026-07-18"}, [rule], today=date(2026, 7, 17)
    )
    assert len(issues) == 1
    assert issues[0].source == "rule_engine"


def test_duplicate_documents_merge_legal_bases() -> None:
    documents = [
        SimpleNamespace(code="birth_certificate", name="Giấy chứng sinh", description=None, required=True, legal_basis="Căn cứ A"),
        SimpleNamespace(code="other", name="  giấy   chứng sinh ", description="Bản chính", required=False, legal_basis="Căn cứ B"),
    ]
    merged = deduplicate_documents(documents)
    assert len(merged) == 1
    assert merged[0]["required"] is True
    assert merged[0]["legal_basis"] == ["Căn cứ A", "Căn cứ B"]
