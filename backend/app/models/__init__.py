import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

JsonType = JSON().with_variant(JSONB(), "postgresql")


class Procedure(Base):
    __tablename__ = "procedures"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    legal_basis: Mapped[str] = mapped_column(Text)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProcedureCase(Base):
    __tablename__ = "procedure_cases"
    __table_args__ = (UniqueConstraint("procedure_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    detection_conditions: Mapped[dict[str, Any]] = mapped_column(JsonType)
    display_priority: Mapped[int] = mapped_column(Integer, default=0)
    requires_officer_confirmation: Mapped[bool] = mapped_column(Boolean, default=False)


class ProcedureStep(Base):
    __tablename__ = "procedure_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("procedure_cases.id", ondelete="CASCADE"), index=True)
    step_order: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    legal_basis: Mapped[str | None] = mapped_column(Text)


class RequiredDocument(Base):
    __tablename__ = "required_documents"
    __table_args__ = (UniqueConstraint("procedure_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("procedure_cases.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    legal_basis: Mapped[str] = mapped_column(Text)


class FormField(Base):
    __tablename__ = "form_fields"
    __table_args__ = (UniqueConstraint("procedure_id", "field_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str] = mapped_column(String(100))
    field_label: Mapped[str] = mapped_column(String(255))
    field_type: Mapped[str] = mapped_column(String(50))
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    field_options: Mapped[list[Any] | None] = mapped_column(JsonType)


class ValidationRule(Base):
    __tablename__ = "validation_rules"
    __table_args__ = (
        UniqueConstraint("procedure_id", "code"),
        CheckConstraint("severity IN ('error', 'warning')", name="ck_validation_rules_severity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("procedure_cases.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(100))
    target_fields: Mapped[list[str]] = mapped_column(JsonType)
    rule_type: Mapped[str] = mapped_column(String(80))
    rule_value: Mapped[dict[str, Any]] = mapped_column(JsonType)
    error_message: Mapped[str] = mapped_column(Text)
    suggested_fix: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="error")
    legal_basis: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class ProcedureQuestion(Base):
    __tablename__ = "procedure_questions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["procedure_id", "field_name"],
            ["form_fields.procedure_id", "form_fields.field_name"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("procedure_cases.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str] = mapped_column(String(100))
    question: Mapped[str] = mapped_column(Text)
    question_order: Mapped[int] = mapped_column(Integer)


class UserSession(Base):
    __tablename__ = "sessions"
    __table_args__ = (CheckConstraint("status IN ('intake', 'checklist', 'precheck', 'ready')", name="ck_sessions_status"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    procedure_id: Mapped[int] = mapped_column(ForeignKey("procedures.id"), index=True)
    # Read-only denormalized copy of the primary row in session_cases, maintained by a DB trigger.
    case_id: Mapped[int | None] = mapped_column(ForeignKey("procedure_cases.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="intake")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SessionCase(Base):
    __tablename__ = "session_cases"
    __table_args__ = (
        Index("uq_session_cases_one_primary", "session_id", unique=True, postgresql_where=text("is_primary")),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("procedure_cases.id", ondelete="CASCADE"), primary_key=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SessionMessage(Base):
    __tablename__ = "session_messages"
    __table_args__ = (CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_session_messages_role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SessionFormData(Base):
    __tablename__ = "session_form_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    data: Mapped[dict[str, Any]] = mapped_column(JsonType)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PrecheckResult(Base):
    __tablename__ = "precheck_results"
    __table_args__ = (
        CheckConstraint("source IN ('rule_engine', 'llm')", name="ck_precheck_results_source"),
        CheckConstraint("severity IN ('error', 'warning')", name="ck_precheck_results_severity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str | None] = mapped_column(String(100))
    rule_id: Mapped[int | None] = mapped_column(ForeignKey("validation_rules.id", ondelete="SET NULL"))
    message: Mapped[str] = mapped_column(Text)
    suggested_fix: Mapped[str] = mapped_column(Text)
    legal_basis: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
