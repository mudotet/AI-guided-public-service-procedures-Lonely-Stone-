import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


CaseCode = Literal[
    "standard",
    "out_of_wedlock",
    "overdue",
    "foreign_element",
    "abandoned",
    "surrogacy",
    "reregistration",
    "correction",
]


class ClassifierFacts(BaseModel):
    child_full_name: str | None
    child_birth_date: str | None
    registration_date: str | None
    child_birth_country: str | None
    parents_married: bool | None
    wants_father_on_certificate: bool | None
    father_full_name: str | None
    mother_full_name: str | None
    father_nationality: str | None
    mother_nationality: str | None
    has_foreign_documents: bool | None
    parentage_evidence: bool | None
    foreign_documents_translated: bool | None
    foreign_documents_legalized: bool | None
    rare_case: Literal["abandoned", "surrogacy", "reregistration", "correction"] | None

    def non_null(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class CaseClassification(BaseModel):
    case_codes: list[CaseCode]
    facts: ClassifierFacts
    missing_fields: list[str]
    confidence: float = Field(ge=0, le=1)
    needs_officer_confirmation: bool
    rationale: str


class IssueRewrite(BaseModel):
    rule_code: str
    message: str
    suggested_fix: str


class IssueRewriteBatch(BaseModel):
    items: list[IssueRewrite]


class LlmConcern(BaseModel):
    field_name: str | None
    message: str
    suggested_fix: str


class LlmConcernBatch(BaseModel):
    items: list[LlmConcern]


class SessionCreate(BaseModel):
    procedure_code: str = "BIRTH_REGISTRATION"


class CaseSummary(BaseModel):
    code: str
    name: str
    description: str | None = None
    is_primary: bool
    requires_officer_confirmation: bool


class SessionResponse(BaseModel):
    id: uuid.UUID
    procedure_id: int
    status: str
    primary_case: CaseSummary | None = None
    cases: list[CaseSummary] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class IntakeMessageRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(min_length=1, max_length=5000)


class IntakeMessageResponse(BaseModel):
    session: SessionResponse
    reply: str
    form_data: dict[str, Any]
    missing_fields: list[str]
    confidence: float
    needs_officer_confirmation: bool


class AudioTranscriptionResponse(BaseModel):
    transcript: str


class ChecklistDocument(BaseModel):
    code: str
    name: str
    description: str | None
    required: bool
    legal_basis: list[str]


class ChecklistStep(BaseModel):
    order: int
    title: str
    description: str
    legal_basis: str | None
    case_code: str | None


class ChecklistResponse(BaseModel):
    session_id: uuid.UUID
    primary_case: CaseSummary | None
    cases: list[CaseSummary]
    documents: list[ChecklistDocument]
    steps: list[ChecklistStep]
    needs_officer_confirmation: bool


class PrecheckRequest(BaseModel):
    session_id: uuid.UUID
    form_data: dict[str, Any]


class PrecheckIssue(BaseModel):
    id: int | None = None
    field_name: str | None
    rule_id: int | None
    message: str
    suggested_fix: str
    legal_basis: str | None
    source: Literal["rule_engine", "llm"]
    severity: Literal["error", "warning"]

    model_config = ConfigDict(from_attributes=True)


class PrecheckResponse(BaseModel):
    session_id: uuid.UUID
    status: str
    issues: list[PrecheckIssue]
    needs_officer_confirmation: bool


class MessageResponse(BaseModel):
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionDetail(SessionResponse):
    messages: list[MessageResponse]
    form_data: dict[str, Any]
    precheck_results: list[PrecheckIssue]


class AdminStats(BaseModel):
    total: int
    intake: int
    checklist: int
    precheck: int
    ready: int
    needs_officer_confirmation: int


class AdminCaseStat(BaseModel):
    code: str
    name: str
    description: str | None
    requires_officer_confirmation: bool
    total: int


class AdminSessionSummary(BaseModel):
    id: uuid.UUID
    status: str
    primary_case: CaseSummary | None
    cases: list[CaseSummary]
    needs_officer_confirmation: bool
    last_user_message: str | None
    created_at: datetime
    updated_at: datetime


class AdminDashboardResponse(BaseModel):
    stats: AdminStats
    case_stats: list[AdminCaseStat]
    sessions: list[AdminSessionSummary]
    result_count: int
    page: int
    page_size: int
    total_pages: int


class AdminSessionUpdate(BaseModel):
    form_data: dict[str, Any]


class OfficialSource(BaseModel):
    code: str
    title: str
    publisher: str
    domain: str
    url: str


class TrustResponse(BaseModel):
    procedure_code: str
    last_reviewed_on: date
    training_disclosure: str
    ai_role: str
    deterministic_role: str
    human_role: str
    sources: list[OfficialSource]
