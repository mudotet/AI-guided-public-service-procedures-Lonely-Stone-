"""Initial birth registration schema and verified demo seed.

Revision ID: 20260717_0001
Revises:
Create Date: 2026-07-17
"""

from datetime import datetime, timezone
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260717_0001"
down_revision = None
branch_labels = None
depends_on = None

JSONB = postgresql.JSONB(astext_type=sa.Text())
GENERAL_BASIS = (
    "Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP; Nghị định 87/2020/NĐ-CP; "
    "Nghị định 104/2022/NĐ-CP; Nghị định 07/2025/NĐ-CP; Nghị định 18/2026/NĐ-CP; "
    "hồ sơ TTHC 1.001193 theo Quyết định 163/QĐ-BTP, kiểm chứng ngày 17/07/2026."
)
PARENTAGE_BASIS = (
    "Hồ sơ TTHC 1.000689 theo Quyết định 163/QĐ-BTP; "
    "Nghị định 123/2015/NĐ-CP và các văn bản sửa đổi, bổ sung."
)
FOREIGN_BASIS = (
    "Nghị định 123/2015/NĐ-CP và các văn bản sửa đổi, bổ sung; "
    "lưu ý hồ sơ TTHC 1.001193 theo Quyết định 163/QĐ-BTP."
)
OVERDUE_BASIS = "Điều 15 Luật Hộ tịch 2014."


def upgrade() -> None:
    op.create_table(
        "procedures",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("legal_basis", sa.Text(), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "procedure_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("detection_conditions", JSONB, nullable=False),
        sa.Column("display_priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requires_officer_confirmation", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("procedure_id", "code"),
    )
    op.create_index("ix_procedure_cases_procedure_id", "procedure_cases", ["procedure_id"])
    op.create_table(
        "procedure_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id", ondelete="CASCADE")),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("legal_basis", sa.Text()),
    )
    op.create_index("ix_procedure_steps_procedure_id", "procedure_steps", ["procedure_id"])
    op.create_index("ix_procedure_steps_case_id", "procedure_steps", ["case_id"])
    op.create_table(
        "required_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id", ondelete="CASCADE")),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("legal_basis", sa.Text(), nullable=False),
        sa.UniqueConstraint("procedure_id", "code"),
    )
    op.create_index("ix_required_documents_procedure_id", "required_documents", ["procedure_id"])
    op.create_index("ix_required_documents_case_id", "required_documents", ["case_id"])
    op.create_table(
        "form_fields",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_name", sa.String(100), nullable=False),
        sa.Column("field_label", sa.String(255), nullable=False),
        sa.Column("field_type", sa.String(50), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("field_options", JSONB),
        sa.UniqueConstraint("procedure_id", "field_name"),
    )
    op.create_index("ix_form_fields_procedure_id", "form_fields", ["procedure_id"])
    op.create_table(
        "validation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id", ondelete="CASCADE")),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("target_fields", JSONB, nullable=False),
        sa.Column("rule_type", sa.String(80), nullable=False),
        sa.Column("rule_value", JSONB, nullable=False),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("suggested_fix", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="error"),
        sa.Column("legal_basis", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("severity IN ('error', 'warning')", name="ck_validation_rules_severity"),
        sa.UniqueConstraint("procedure_id", "code"),
    )
    op.create_index("ix_validation_rules_procedure_id", "validation_rules", ["procedure_id"])
    op.create_index("ix_validation_rules_case_id", "validation_rules", ["case_id"])
    op.create_table(
        "procedure_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id", ondelete="CASCADE")),
        sa.Column("field_name", sa.String(100), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["procedure_id"], ["procedures.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["procedure_id", "field_name"],
            ["form_fields.procedure_id", "form_fields.field_name"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_procedure_questions_procedure_id", "procedure_questions", ["procedure_id"])
    op.create_index("ix_procedure_questions_case_id", "procedure_questions", ["case_id"])
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("procedure_id", sa.Integer(), sa.ForeignKey("procedures.id"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id")),
        sa.Column("status", sa.String(20), nullable=False, server_default="intake"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('intake', 'checklist', 'precheck', 'ready')", name="ck_sessions_status"),
    )
    op.create_index("ix_sessions_procedure_id", "sessions", ["procedure_id"])
    op.create_index("ix_sessions_case_id", "sessions", ["case_id"])
    op.create_table(
        "session_cases",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("procedure_cases.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "uq_session_cases_one_primary",
        "session_cases",
        ["session_id"],
        unique=True,
        postgresql_where=sa.text("is_primary"),
    )
    op.create_table(
        "session_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_session_messages_role"),
    )
    op.create_index("ix_session_messages_session_id", "session_messages", ["session_id"])
    op.create_table(
        "session_form_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("data", JSONB, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "precheck_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_name", sa.String(100)),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("validation_rules.id", ondelete="SET NULL")),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("suggested_fix", sa.Text(), nullable=False),
        sa.Column("legal_basis", sa.Text()),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("source IN ('rule_engine', 'llm')", name="ck_precheck_results_source"),
        sa.CheckConstraint("severity IN ('error', 'warning')", name="ck_precheck_results_severity"),
    )
    op.create_index("ix_precheck_results_session_id", "precheck_results", ["session_id"])

    op.execute(
        """
        CREATE FUNCTION sync_session_primary_case() RETURNS trigger AS $$
        DECLARE target_session uuid;
        BEGIN
          target_session := COALESCE(NEW.session_id, OLD.session_id);
          UPDATE sessions
          SET case_id = (
            SELECT case_id FROM session_cases
            WHERE session_id = target_session AND is_primary
          ), updated_at = now()
          WHERE id = target_session;
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_sync_session_primary_case
        AFTER INSERT OR UPDATE OR DELETE ON session_cases
        FOR EACH ROW EXECUTE FUNCTION sync_session_primary_case();
        """
    )

    _seed()


def _seed() -> None:
    def json_literal(value: object) -> object:
        return op.inline_literal(json.dumps(value, ensure_ascii=False))

    procedures = sa.table(
        "procedures",
        sa.column("id", sa.Integer),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("legal_basis", sa.Text),
        sa.column("last_verified_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        procedures,
        [{
            "id": 1,
            "code": "BIRTH_REGISTRATION",
            "name": "Đăng ký khai sinh",
            "description": "Hướng dẫn tiếp nhận và kiểm tra trước hồ sơ đăng ký khai sinh.",
            "legal_basis": GENERAL_BASIS,
            "last_verified_at": datetime(2026, 7, 17, tzinfo=timezone.utc),
        }],
    )

    cases = sa.table(
        "procedure_cases",
        sa.column("id", sa.Integer),
        sa.column("procedure_id", sa.Integer),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("detection_conditions", JSONB),
        sa.column("display_priority", sa.Integer),
        sa.column("requires_officer_confirmation", sa.Boolean),
    )
    case_rows = [
        {"id": 1, "procedure_id": 1, "code": "standard", "name": "Trường hợp chuẩn", "description": "Cha mẹ đã kết hôn, trẻ sinh tại Việt Nam và đăng ký không quá 60 ngày.", "detection_conditions": {"parents_married": True, "child_birth_country": "VN", "max_days": 60}, "display_priority": 10, "requires_officer_confirmation": False},
        {"id": 2, "procedure_id": 1, "code": "out_of_wedlock", "name": "Con ngoài giá thú", "description": "Cha mẹ chưa đăng ký kết hôn; nếu ghi tên cha thì kết hợp thủ tục nhận cha, con.", "detection_conditions": {"parents_married": False}, "display_priority": 80, "requires_officer_confirmation": False},
        {"id": 3, "procedure_id": 1, "code": "overdue", "name": "Đăng ký quá 60 ngày", "description": "Ngày đăng ký cách ngày sinh trên 60 ngày; số ngày do backend tự tính.", "detection_conditions": {"days_since_birth_gt": 60}, "display_priority": 50, "requires_officer_confirmation": False},
        {"id": 4, "procedure_id": 1, "code": "foreign_element", "name": "Có yếu tố nước ngoài", "description": "Cha hoặc mẹ là người nước ngoài, hoặc trẻ sinh ngoài Việt Nam.", "detection_conditions": {"foreign_parent_or_birth_abroad": True}, "display_priority": 90, "requires_officer_confirmation": False},
        {"id": 5, "procedure_id": 1, "code": "abandoned", "name": "Trẻ bị bỏ rơi/chưa xác định cha mẹ", "description": "Case hiếm, chỉ nhận diện và chuyển cán bộ hộ tịch.", "detection_conditions": {"rare_case": "abandoned"}, "display_priority": 120, "requires_officer_confirmation": True},
        {"id": 6, "procedure_id": 1, "code": "surrogacy", "name": "Sinh con nhờ mang thai hộ", "description": "Case hiếm, chỉ nhận diện và chuyển cán bộ hộ tịch.", "detection_conditions": {"rare_case": "surrogacy"}, "display_priority": 120, "requires_officer_confirmation": True},
        {"id": 7, "procedure_id": 1, "code": "reregistration", "name": "Đăng ký lại khai sinh", "description": "Case hiếm, chỉ nhận diện và chuyển cán bộ hộ tịch.", "detection_conditions": {"rare_case": "reregistration"}, "display_priority": 120, "requires_officer_confirmation": True},
        {"id": 8, "procedure_id": 1, "code": "correction", "name": "Cải chính thông tin hộ tịch", "description": "Case hiếm, chỉ nhận diện và chuyển cán bộ hộ tịch.", "detection_conditions": {"rare_case": "correction"}, "display_priority": 120, "requires_officer_confirmation": True},
    ]
    for row in case_rows:
        row["detection_conditions"] = json_literal(row["detection_conditions"])
    op.bulk_insert(cases, case_rows, multiinsert=False)

    steps = sa.table("procedure_steps", sa.column("id", sa.Integer), sa.column("procedure_id", sa.Integer), sa.column("case_id", sa.Integer), sa.column("step_order", sa.Integer), sa.column("title", sa.String), sa.column("description", sa.Text), sa.column("legal_basis", sa.Text))
    op.bulk_insert(steps, [
        {"id": 1, "procedure_id": 1, "case_id": None, "step_order": 1, "title": "Chuẩn bị và nộp hồ sơ", "description": "Nộp trực tiếp, qua bưu chính hoặc trực tuyến theo kênh được cơ quan tiếp nhận hỗ trợ.", "legal_basis": GENERAL_BASIS},
        {"id": 2, "procedure_id": 1, "case_id": None, "step_order": 2, "title": "Cơ quan tiếp nhận kiểm tra hồ sơ", "description": "Cán bộ kiểm tra tính chính xác, đầy đủ, thống nhất và hợp lệ; hồ sơ thiếu phải được hướng dẫn bổ sung rõ nội dung.", "legal_basis": GENERAL_BASIS},
        {"id": 3, "procedure_id": 1, "case_id": None, "step_order": 3, "title": "Công chức tư pháp - hộ tịch xử lý", "description": "Thông tin được ghi vào Sổ đăng ký khai sinh và cập nhật trên hệ thống hộ tịch điện tử khi đủ điều kiện.", "legal_basis": GENERAL_BASIS},
        {"id": 4, "procedure_id": 1, "case_id": None, "step_order": 4, "title": "Nhận Giấy khai sinh", "description": "Kiểm tra lại thông tin trên kết quả trước khi xác nhận hoặc nhận bản giấy.", "legal_basis": GENERAL_BASIS},
        {"id": 5, "procedure_id": 1, "case_id": 2, "step_order": 1, "title": "Xác định có ghi tên cha hay không", "description": "Nếu chưa xác định cha thì phần thông tin cha để trống; nếu người cha yêu cầu nhận con thì giải quyết kết hợp nhận cha, con và đăng ký khai sinh.", "legal_basis": PARENTAGE_BASIS},
        {"id": 6, "procedure_id": 1, "case_id": 3, "step_order": 1, "title": "Xác nhận mốc quá 60 ngày", "description": "Hệ thống tự tính từ ngày sinh đến ngày đăng ký; không yêu cầu người dùng tự kết luận đúng hạn hay quá hạn.", "legal_basis": OVERDUE_BASIS},
        {"id": 7, "procedure_id": 1, "case_id": 4, "step_order": 1, "title": "Kiểm tra giấy tờ nước ngoài", "description": "Xác định giấy tờ cần dịch và hợp pháp hóa lãnh sự hoặc thuộc trường hợp được miễn.", "legal_basis": FOREIGN_BASIS},
        {"id": 8, "procedure_id": 1, "case_id": 4, "step_order": 2, "title": "Xác nhận cơ quan có thẩm quyền", "description": "Đối chiếu nơi sinh, quốc tịch và nơi cư trú trước khi chọn nơi nộp; trường hợp chưa rõ phải hỏi cán bộ hộ tịch.", "legal_basis": FOREIGN_BASIS},
    ])

    documents = sa.table("required_documents", sa.column("id", sa.Integer), sa.column("procedure_id", sa.Integer), sa.column("case_id", sa.Integer), sa.column("code", sa.String), sa.column("name", sa.String), sa.column("description", sa.Text), sa.column("required", sa.Boolean), sa.column("legal_basis", sa.Text))
    op.bulk_insert(documents, [
        {"id": 1, "procedure_id": 1, "case_id": None, "code": "birth_declaration", "name": "Tờ khai đăng ký khai sinh theo mẫu", "description": "Dùng khi nộp trực tiếp hoặc qua bưu chính; trực tuyến dùng mẫu hộ tịch điện tử tương tác.", "required": True, "legal_basis": GENERAL_BASIS},
        {"id": 2, "procedure_id": 1, "case_id": None, "code": "birth_certificate", "name": "Giấy chứng sinh hoặc giấy tờ thay thế hợp lệ", "description": "Nếu không có Giấy chứng sinh: văn bản người làm chứng; nếu không có người làm chứng: giấy cam đoan về việc sinh.", "required": True, "legal_basis": GENERAL_BASIS},
        {"id": 3, "procedure_id": 1, "case_id": None, "code": "requester_identity", "name": "Giấy tờ tùy thân còn giá trị của người yêu cầu", "description": "Xuất trình khi làm thủ tục trực tiếp nếu dữ liệu chưa được khai thác từ cơ sở dữ liệu.", "required": True, "legal_basis": GENERAL_BASIS},
        {"id": 4, "procedure_id": 1, "case_id": None, "code": "residence_proof", "name": "Giấy tờ chứng minh thông tin cư trú khi không khai thác được dữ liệu", "description": "Chỉ yêu cầu khi cơ quan không khai thác được thông tin cư trú.", "required": False, "legal_basis": "Khoản 2 Điều 14 Nghị định 104/2022/NĐ-CP; hồ sơ TTHC 1.001193 theo Quyết định 163/QĐ-BTP."},
        {"id": 5, "procedure_id": 1, "case_id": 2, "code": "parentage_declaration", "name": "Tờ khai đăng ký nhận cha, mẹ, con theo mẫu", "description": "Cần khi muốn kết hợp ghi nhận cha, con lúc đăng ký khai sinh.", "required": True, "legal_basis": PARENTAGE_BASIS},
        {"id": 6, "procedure_id": 1, "case_id": 2, "code": "parentage_evidence", "name": "Chứng cứ chứng minh quan hệ cha, con", "description": "Văn bản của cơ quan y tế, giám định hoặc cơ quan có thẩm quyền; nếu không có, áp dụng hồ sơ cam đoan và người làm chứng theo nguồn.", "required": True, "legal_basis": PARENTAGE_BASIS},
        {"id": 7, "procedure_id": 1, "case_id": 4, "code": "foreign_document_translation", "name": "Bản dịch tiếng Việt được chứng thực của giấy tờ nước ngoài", "description": "Áp dụng với giấy tờ do cơ quan nước ngoài cấp khi nguồn yêu cầu bản dịch để sử dụng tại Việt Nam.", "required": True, "legal_basis": FOREIGN_BASIS},
        {"id": 8, "procedure_id": 1, "case_id": 4, "code": "foreign_document_legalization", "name": "Giấy tờ nước ngoài đã hợp pháp hóa lãnh sự hoặc chứng cứ được miễn", "description": "Không yêu cầu hợp pháp hóa nếu thuộc trường hợp được miễn theo điều ước quốc tế.", "required": True, "legal_basis": FOREIGN_BASIS},
    ])

    fields = sa.table("form_fields", sa.column("id", sa.Integer), sa.column("procedure_id", sa.Integer), sa.column("field_name", sa.String), sa.column("field_label", sa.String), sa.column("field_type", sa.String), sa.column("required", sa.Boolean), sa.column("field_options", JSONB))
    field_rows = [
        (1, "child_full_name", "Họ tên trẻ", "text", True, None),
        (2, "child_birth_date", "Ngày sinh của trẻ", "date", True, None),
        (3, "registration_date", "Ngày dự kiến đăng ký", "date", False, None),
        (4, "child_birth_country", "Quốc gia nơi trẻ sinh", "text", True, None),
        (5, "parents_married", "Cha mẹ đã đăng ký kết hôn", "boolean", True, None),
        (6, "wants_father_on_certificate", "Có muốn ghi tên cha", "boolean", False, None),
        (7, "father_full_name", "Họ tên cha", "text", False, None),
        (8, "mother_full_name", "Họ tên mẹ", "text", True, None),
        (9, "father_nationality", "Quốc tịch của cha", "text", False, None),
        (10, "mother_nationality", "Quốc tịch của mẹ", "text", True, None),
        (11, "parentage_evidence", "Có chứng cứ quan hệ cha con", "boolean", False, None),
        (12, "has_foreign_documents", "Có giấy tờ do nước ngoài cấp", "boolean", False, None),
        (13, "foreign_documents_translated", "Giấy tờ nước ngoài đã dịch chứng thực", "boolean", False, None),
        (14, "foreign_documents_legalized", "Giấy tờ nước ngoài đã hợp pháp hóa/được miễn", "boolean", False, None),
        (15, "rare_case", "Trường hợp đặc biệt", "select", False, ["abandoned", "surrogacy", "reregistration", "correction"]),
    ]
    op.bulk_insert(fields, [{"id": row[0], "procedure_id": 1, "field_name": row[1], "field_label": row[2], "field_type": row[3], "required": row[4], "field_options": json_literal(row[5]) if row[5] is not None else None} for row in field_rows], multiinsert=False)

    questions = sa.table("procedure_questions", sa.column("id", sa.Integer), sa.column("procedure_id", sa.Integer), sa.column("case_id", sa.Integer), sa.column("field_name", sa.String), sa.column("question", sa.Text), sa.column("question_order", sa.Integer))
    op.bulk_insert(questions, [
        {"id": 1, "procedure_id": 1, "case_id": None, "field_name": "child_birth_date", "question": "Ngày sinh của bé là ngày nào?", "question_order": 1},
        {"id": 2, "procedure_id": 1, "case_id": None, "field_name": "child_birth_country", "question": "Bé sinh tại Việt Nam hay ở nước ngoài?", "question_order": 2},
        {"id": 3, "procedure_id": 1, "case_id": None, "field_name": "parents_married", "question": "Cha mẹ của bé đã đăng ký kết hôn chưa?", "question_order": 3},
        {"id": 4, "procedure_id": 1, "case_id": None, "field_name": "father_nationality", "question": "Cha của bé có quốc tịch gì?", "question_order": 4},
        {"id": 5, "procedure_id": 1, "case_id": None, "field_name": "mother_nationality", "question": "Mẹ của bé có quốc tịch gì?", "question_order": 5},
        {"id": 6, "procedure_id": 1, "case_id": 2, "field_name": "wants_father_on_certificate", "question": "Bạn có muốn tên cha xuất hiện trên Giấy khai sinh không?", "question_order": 6},
    ])

    rules = sa.table("validation_rules", sa.column("id", sa.Integer), sa.column("procedure_id", sa.Integer), sa.column("case_id", sa.Integer), sa.column("code", sa.String), sa.column("target_fields", JSONB), sa.column("rule_type", sa.String), sa.column("rule_value", JSONB), sa.column("error_message", sa.Text), sa.column("suggested_fix", sa.Text), sa.column("severity", sa.String), sa.column("legal_basis", sa.Text), sa.column("enabled", sa.Boolean))
    rule_rows = [
        (1, None, "child_name_required", ["child_full_name"], "required", {}, "Chưa có họ tên của trẻ.", "Điền họ, chữ đệm và tên dự kiến của trẻ.", "error", GENERAL_BASIS),
        (2, None, "child_name_format", ["child_full_name"], "regex", {"pattern": r"[^\d]+"}, "Họ tên của trẻ không được chứa chữ số.", "Kiểm tra và bỏ các chữ số khỏi họ tên.", "error", GENERAL_BASIS),
        (3, None, "birth_date_required", ["child_birth_date"], "required", {}, "Chưa có ngày sinh của trẻ.", "Điền ngày sinh đúng theo Giấy chứng sinh hoặc giấy tờ thay thế.", "error", GENERAL_BASIS),
        (4, None, "birth_date_valid", ["child_birth_date"], "date_not_future", {}, "Ngày sinh không hợp lệ hoặc nằm trong tương lai.", "Điền ngày theo định dạng YYYY-MM-DD và không sau ngày hiện tại.", "error", GENERAL_BASIS),
        (5, None, "registration_after_birth", ["registration_date", "child_birth_date"], "date_on_or_after", {"earlier_field": "child_birth_date", "later_field": "registration_date"}, "Ngày đăng ký không thể trước ngày sinh.", "Kiểm tra lại ngày sinh và ngày dự kiến đăng ký.", "error", GENERAL_BASIS),
        (6, None, "mother_name_required", ["mother_full_name"], "required", {}, "Chưa có họ tên người mẹ.", "Điền họ tên người mẹ theo giấy tờ nhân thân.", "error", GENERAL_BASIS),
        (7, None, "birth_country_required", ["child_birth_country"], "required", {}, "Chưa có quốc gia nơi trẻ sinh.", "Điền Việt Nam hoặc tên quốc gia nơi trẻ sinh.", "error", GENERAL_BASIS),
        (8, 2, "father_choice_required", ["wants_father_on_certificate"], "required", {}, "Chưa xác định có yêu cầu ghi tên cha hay không.", "Chọn rõ có hoặc không để hệ thống xác định hồ sơ nhận cha, con.", "error", PARENTAGE_BASIS),
        (9, 2, "father_name_when_requested", ["father_full_name"], "required_when", {"field": "wants_father_on_certificate", "equals": True}, "Muốn ghi tên cha nhưng chưa điền họ tên cha.", "Điền họ tên cha theo giấy tờ nhân thân.", "error", PARENTAGE_BASIS),
        (10, 2, "parentage_evidence_when_requested", ["parentage_evidence"], "must_be_true_when", {"field": "wants_father_on_certificate", "equals": True}, "Muốn ghi tên cha nhưng chưa xác nhận có chứng cứ quan hệ cha, con.", "Chuẩn bị chứng cứ theo hồ sơ thủ tục nhận cha, con; nếu không có, hỏi cán bộ về cam đoan và người làm chứng.", "error", PARENTAGE_BASIS),
        (11, 3, "overdue_notice", [], "always", {}, "Hệ thống tính được thời điểm đăng ký đã quá 60 ngày kể từ ngày sinh.", "Vẫn chuẩn bị hồ sơ khai sinh và lưu ý cán bộ về thời điểm đăng ký; không tự thêm giấy tờ ngoài checklist.", "warning", OVERDUE_BASIS),
        (12, 4, "foreign_documents_declared", ["has_foreign_documents"], "required", {}, "Chưa xác định hồ sơ có giấy tờ do nước ngoài cấp hay không.", "Kiểm tra và chọn có hoặc không.", "error", FOREIGN_BASIS),
        (13, 4, "foreign_translation", ["foreign_documents_translated"], "must_be_true_when", {"field": "has_foreign_documents", "equals": True}, "Giấy tờ nước ngoài chưa được xác nhận đã có bản dịch tiếng Việt được chứng thực.", "Chuẩn bị bản dịch tiếng Việt được chứng thực trước khi nộp.", "error", FOREIGN_BASIS),
        (14, 4, "foreign_legalization", ["foreign_documents_legalized"], "must_be_true_when", {"field": "has_foreign_documents", "equals": True}, "Chưa xác nhận giấy tờ nước ngoài đã hợp pháp hóa lãnh sự hoặc thuộc diện được miễn.", "Kiểm tra hợp pháp hóa lãnh sự; nếu cho rằng được miễn, chuẩn bị căn cứ miễn để cán bộ đối chiếu.", "error", FOREIGN_BASIS),
        (15, 5, "abandoned_manual_review", [], "always", {}, "Trẻ bị bỏ rơi hoặc chưa xác định cha mẹ là trường hợp cần cán bộ hộ tịch xử lý trực tiếp.", "Liên hệ cơ quan hộ tịch và chuẩn bị biên bản về việc trẻ bị bỏ rơi nếu có.", "warning", GENERAL_BASIS),
        (16, 6, "surrogacy_manual_review", [], "always", {}, "Sinh con nhờ mang thai hộ là trường hợp cần cán bộ hộ tịch xác nhận trực tiếp.", "Liên hệ cơ quan hộ tịch và chuẩn bị văn bản của cơ sở y tế thực hiện kỹ thuật hỗ trợ sinh sản.", "warning", GENERAL_BASIS),
        (17, 7, "reregistration_manual_review", [], "always", {}, "Đăng ký lại khai sinh cần cán bộ hộ tịch xác nhận trực tiếp.", "Mang các giấy tờ cá nhân và thông tin về đăng ký trước đây để cán bộ kiểm tra.", "warning", GENERAL_BASIS),
        (18, 8, "correction_manual_review", [], "always", {}, "Cải chính thông tin đã đăng ký cần cán bộ hộ tịch xác nhận trực tiếp.", "Mang bản chính giấy tờ hộ tịch và chứng cứ cho nội dung cần cải chính.", "warning", GENERAL_BASIS),
        (19, None, "registration_date_valid", ["registration_date"], "date_valid", {}, "Ngày dự kiến đăng ký không đúng định dạng.", "Điền ngày theo định dạng YYYY-MM-DD hoặc để trống để hệ thống dùng ngày hiện tại.", "error", GENERAL_BASIS),
    ]
    op.bulk_insert(rules, [{"id": row[0], "procedure_id": 1, "case_id": row[1], "code": row[2], "target_fields": json_literal(row[3]), "rule_type": row[4], "rule_value": json_literal(row[5]), "error_message": row[6], "suggested_fix": row[7], "severity": row[8], "legal_basis": row[9], "enabled": True} for row in rule_rows], multiinsert=False)

    for table_name in ["procedures", "procedure_cases", "procedure_steps", "required_documents", "form_fields", "procedure_questions", "validation_rules"]:
        op.execute(sa.text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), (SELECT MAX(id) FROM {table_name}), true)"))


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_sync_session_primary_case ON session_cases")
    op.execute("DROP FUNCTION IF EXISTS sync_session_primary_case")
    for table in [
        "precheck_results",
        "session_form_data",
        "session_messages",
        "session_cases",
        "sessions",
        "procedure_questions",
        "validation_rules",
        "form_fields",
        "required_documents",
        "procedure_steps",
        "procedure_cases",
        "procedures",
    ]:
        op.drop_table(table)
