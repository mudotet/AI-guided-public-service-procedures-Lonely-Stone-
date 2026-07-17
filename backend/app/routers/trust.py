from datetime import date

from fastapi import APIRouter

from app.schemas import OfficialSource, TrustResponse

router = APIRouter(tags=["trust"])

SOURCE_URLS = (
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-66dc-714a-90a8-11942739ea86",
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-3faf-768a-9224-9cb889436133",
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-95f7-7548-bce5-81bc8224b321",
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-95d8-77dd-86c5-880463eb8dbe",
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-867c-72db-b6a7-dcbd8c763807",
    "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-6711-733d-b674-fc3d805e70c8",
)


@router.get("/trust", response_model=TrustResponse)
def trust() -> TrustResponse:
    return TrustResponse(
        procedure_code="BIRTH_REGISTRATION",
        last_reviewed_on=date(2026, 7, 17),
        training_disclosure=(
            "Hệ thống không tuyên bố mô hình AI đã được fine-tune bằng các tài liệu này. "
            "AI chỉ xử lý ngôn ngữ trong ngữ cảnh nghiệp vụ do backend cung cấp."
        ),
        ai_role="Trích xuất dữ kiện, phân loại tình huống và diễn đạt câu trả lời dễ hiểu.",
        deterministic_role="Checklist, quy tắc kiểm tra và căn cứ pháp lý được quản lý tại backend.",
        human_role="Trường hợp hiếm, mâu thuẫn hoặc chưa chắc chắn phải được cán bộ hộ tịch xác nhận.",
        sources=[
            OfficialSource(
                code=f"dvcqg-{index:02d}",
                title=f"Nguồn nghiệp vụ đăng ký khai sinh {index:02d}",
                publisher="Cổng Dịch vụ công Quốc gia",
                domain="dichvucong.gov.vn",
                url=url,
            )
            for index, url in enumerate(SOURCE_URLS, 1)
        ],
    )
