from app.services.pdf_generator import build_birth_registration_pdf


def test_birth_registration_pdf_is_created_from_vietnamese_form_data() -> None:
    pdf = build_birth_registration_pdf(
        {
            "child_full_name": "Nguyễn An",
            "child_birth_date": "2026-07-01",
            "mother_full_name": "Trần Thị Mai",
            "mother_nationality": "Việt Nam",
        },
        "demo-session",
    )
    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 10_000
