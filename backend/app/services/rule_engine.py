from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Iterable, Mapping


RARE_CASES = {"abandoned", "surrogacy", "reregistration", "correction"}
VIETNAM_VALUES = {"vn", "vnm", "việt nam", "viet nam", "vietnam"}


@dataclass(frozen=True)
class CaseDetection:
    codes: tuple[str, ...]
    days_since_birth: int | None
    requires_officer_confirmation: bool


@dataclass(frozen=True)
class RuleDefinition:
    code: str
    target_fields: tuple[str, ...]
    rule_type: str
    rule_value: Mapping[str, Any]
    error_message: str
    suggested_fix: str
    legal_basis: str
    severity: str = "error"
    id: int | None = None


@dataclass(frozen=True)
class ValidationIssue:
    rule_code: str
    field_name: str | None
    message: str
    suggested_fix: str
    legal_basis: str | None
    severity: str
    source: str = "rule_engine"
    rule_id: int | None = None


def _date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            return None
    return None


def _bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().casefold()
        if normalized in {"true", "yes", "có", "co", "đã", "da"}:
            return True
        if normalized in {"false", "no", "không", "khong", "chưa", "chua"}:
            return False
    return None


def _is_vietnam(value: Any) -> bool | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return value.strip().casefold() in VIETNAM_VALUES


def detect_case_codes(data: Mapping[str, Any], today: date | None = None) -> CaseDetection:
    today = today or date.today()
    birth_date = _date(data.get("child_birth_date"))
    registration_value = data.get("registration_date")
    registration_date = today if _missing(registration_value) else _date(registration_value)
    days = (registration_date - birth_date).days if birth_date and registration_date else None
    married = _bool(data.get("parents_married"))
    birth_in_vietnam = _is_vietnam(data.get("child_birth_country"))
    father_vietnamese = _is_vietnam(data.get("father_nationality"))
    mother_vietnamese = _is_vietnam(data.get("mother_nationality"))
    foreign = birth_in_vietnam is False or father_vietnamese is False or mother_vietnamese is False
    rare_case = data.get("rare_case")

    codes: list[str] = []
    if married is False:
        codes.append("out_of_wedlock")
    if days is not None and days > 60:
        codes.append("overdue")
    if foreign:
        codes.append("foreign_element")
    if rare_case in RARE_CASES:
        codes.append(str(rare_case))

    fully_standard = (
        married is True
        and birth_in_vietnam is True
        and not foreign
        and days is not None
        and 0 <= days <= 60
        and rare_case not in RARE_CASES
    )
    if fully_standard:
        codes.insert(0, "standard")

    return CaseDetection(tuple(dict.fromkeys(codes)), days, rare_case in RARE_CASES)


def _missing(value: Any) -> bool:
    return value is None or value == "" or value == []


def _condition_matches(data: Mapping[str, Any], value: Mapping[str, Any]) -> bool:
    actual = data.get(str(value.get("field")))
    expected = value.get("equals")
    if isinstance(expected, bool):
        actual = _bool(actual)
    return actual == expected


def _violates(rule: RuleDefinition, data: Mapping[str, Any], today: date) -> bool:
    field_name = rule.target_fields[0] if rule.target_fields else None
    value = data.get(field_name) if field_name else None

    if rule.rule_type == "required":
        return _missing(value)
    if rule.rule_type == "date_not_future":
        parsed = _date(value)
        return not _missing(value) and (parsed is None or parsed > today)
    if rule.rule_type == "date_valid":
        return not _missing(value) and _date(value) is None
    if rule.rule_type == "regex":
        return not _missing(value) and re.fullmatch(str(rule.rule_value["pattern"]), str(value)) is None
    if rule.rule_type == "date_on_or_after":
        earlier = _date(data.get(str(rule.rule_value["earlier_field"])))
        later = _date(data.get(str(rule.rule_value["later_field"])))
        return earlier is not None and later is not None and later < earlier
    if rule.rule_type == "required_when":
        return _condition_matches(data, rule.rule_value) and _missing(value)
    if rule.rule_type == "must_be_true_when":
        return _condition_matches(data, rule.rule_value) and _bool(value) is not True
    if rule.rule_type == "always":
        return True
    raise ValueError(f"Unsupported rule type: {rule.rule_type}")


def run_rules(
    data: Mapping[str, Any], rules: Iterable[RuleDefinition], today: date | None = None
) -> list[ValidationIssue]:
    today = today or date.today()
    issues: list[ValidationIssue] = []
    for rule in rules:
        if not _violates(rule, data, today):
            continue
        issues.append(
            ValidationIssue(
                rule_code=rule.code,
                rule_id=rule.id,
                field_name=rule.target_fields[0] if len(rule.target_fields) == 1 else None,
                message=rule.error_message,
                suggested_fix=rule.suggested_fix,
                legal_basis=rule.legal_basis,
                severity=rule.severity,
            )
        )
    return issues
