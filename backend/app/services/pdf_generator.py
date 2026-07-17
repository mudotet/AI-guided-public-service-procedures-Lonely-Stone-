from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

FONT_NAME = "BirthGuidePdf"
FONT_PATH = Path(__file__).resolve().parents[1] / "assets" / "Geist-Regular.ttf"
pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))

BODY = ParagraphStyle("body", fontName=FONT_NAME, fontSize=9.5, leading=13, textColor=colors.HexColor("#1F2937"))
LABEL = ParagraphStyle("label", parent=BODY, fontSize=8.8, textColor=colors.HexColor("#475467"))
CENTER = ParagraphStyle("center", parent=BODY, alignment=TA_CENTER)
HEADING = ParagraphStyle("heading", parent=CENTER, fontSize=15, leading=19, spaceAfter=3 * mm)
SECTION = ParagraphStyle("section", parent=BODY, fontSize=11, textColor=colors.HexColor("#063B82"), spaceBefore=3 * mm, spaceAfter=2 * mm)
NOTE = ParagraphStyle("note", parent=BODY, fontSize=8.5, leading=12, textColor=colors.HexColor("#667085"))


def _text(value: Any) -> str:
    if value is None or value == "":
        return "Chưa cung cấp"
    if isinstance(value, bool):
        return "Có" if value else "Không"
    return str(value)


def _date(value: Any) -> str:
    try:
        return date.fromisoformat(str(value)).strftime("%d/%m/%Y")
    except ValueError:
        return _text(value)


def _paragraph(value: Any, style: ParagraphStyle = BODY) -> Paragraph:
    return Paragraph(escape(_text(value)), style)


def _table(rows: list[tuple[str, Any]]) -> Table:
    table = Table(
        [[_paragraph(label, LABEL), _paragraph(value)] for label, value in rows],
        colWidths=[53 * mm, 124 * mm],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F7FA")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def build_birth_registration_pdf(form_data: dict[str, Any], session_id: str) -> bytes:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=17 * mm,
        title="Bản xem trước tờ khai đăng ký khai sinh",
        author="Hệ thống AI hướng dẫn đăng ký khai sinh",
    )

    story = [
        Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", CENTER),
        Paragraph("Độc lập - Tự do - Hạnh phúc", CENTER),
        Spacer(1, 4 * mm),
        Paragraph("BẢN XEM TRƯỚC TỜ KHAI ĐĂNG KÝ KHAI SINH", HEADING),
        Paragraph(f"Mã phiên: {escape(session_id.upper())}", CENTER),
        Spacer(1, 3 * mm),
        Paragraph("Thông tin của trẻ", SECTION),
        _table(
            [
                ("Họ, chữ đệm, tên", form_data.get("child_full_name")),
                ("Ngày sinh", _date(form_data.get("child_birth_date"))),
                ("Quốc gia nơi sinh", form_data.get("child_birth_country")),
                ("Ngày dự kiến đăng ký", _date(form_data.get("registration_date"))),
            ]
        ),
        Paragraph("Thông tin cha mẹ", SECTION),
        _table(
            [
                ("Họ, chữ đệm, tên người mẹ", form_data.get("mother_full_name")),
                ("Quốc tịch mẹ", form_data.get("mother_nationality")),
                ("Họ, chữ đệm, tên người cha", form_data.get("father_full_name")),
                ("Quốc tịch cha", form_data.get("father_nationality")),
                ("Cha mẹ đã đăng ký kết hôn", form_data.get("parents_married")),
            ]
        ),
        Paragraph("Thông tin bổ sung theo trường hợp", SECTION),
        _table(
            [
                ("Có ghi tên cha trên giấy khai sinh", form_data.get("wants_father_on_certificate")),
                ("Có chứng cứ quan hệ cha con", form_data.get("parentage_evidence")),
                ("Có giấy tờ nước ngoài", form_data.get("has_foreign_documents")),
                ("Đã dịch và chứng thực", form_data.get("foreign_documents_translated")),
                ("Đã hợp pháp hóa hoặc được miễn", form_data.get("foreign_documents_legalized")),
            ]
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            "Bản xem trước này chỉ điền các thông tin hệ thống đã nhận được. "
            "Các mục chưa được thu thập được giữ ở trạng thái “Chưa cung cấp”; hệ thống không tự suy đoán dữ liệu.",
            NOTE,
        ),
    ]

    def footer(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setFont(FONT_NAME, 8)
        canvas.setFillColor(colors.HexColor("#667085"))
        canvas.drawString(16 * mm, 9 * mm, f"Tạo lúc {datetime.now().strftime('%d/%m/%Y %H:%M')} - Bản xem trước")
        canvas.drawRightString(194 * mm, 9 * mm, f"Trang {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
