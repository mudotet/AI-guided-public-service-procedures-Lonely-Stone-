import json
from collections.abc import Sequence
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.config import settings
from app.schemas import CaseClassification, IssueRewriteBatch, LlmConcernBatch

T = TypeVar("T", bound=BaseModel)


class OpenAIClient:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client = OpenAI(api_key=settings.openai_api_key)

    @staticmethod
    def _parsed(response: Any, expected: type[T]) -> T:
        parsed = getattr(response, "output_parsed", None)
        if isinstance(parsed, expected):
            return parsed
        for output in response.output:
            if output.type != "message":
                continue
            for item in output.content:
                if item.type == "refusal":
                    raise RuntimeError(f"OpenAI refusal: {item.refusal}")
                if isinstance(getattr(item, "parsed", None), expected):
                    return item.parsed
        raise RuntimeError("OpenAI returned no parseable structured output")

    def classify(self, messages: Sequence[dict[str, str]]) -> CaseClassification:
        response = self.client.responses.parse(
            model=settings.openai_classifier_model,
            input=list(messages),
            text_format=CaseClassification,
        )
        return self._parsed(response, CaseClassification)

    def converse(self, messages: Sequence[dict[str, str]], trusted_context: str) -> str:
        response = self.client.responses.create(
            model=settings.openai_assistant_model,
            instructions=(
                "Bạn là trợ lý hướng dẫn đăng ký khai sinh, viết tiếng Việt ngắn gọn, dễ hiểu. "
                "Chỉ dùng dữ kiện và căn cứ trong TRUSTED_CONTEXT; không tự tạo điều luật, giấy tờ "
                "hoặc kết luận thẩm quyền. Nếu thiếu dữ liệu, hỏi đúng một câu rõ nhất. Nếu thuộc case "
                "hiếm hoặc không chắc chắn, nói nguyên văn: 'Cần cán bộ hộ tịch xác nhận trực tiếp'.\n\n"
                f"TRUSTED_CONTEXT:\n{trusted_context}"
            ),
            input=list(messages),
        )
        return response.output_text

    def explain_issues(self, issues: list[dict[str, Any]]) -> IssueRewriteBatch:
        response = self.client.responses.parse(
            model=settings.openai_assistant_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Viết lại từng lỗi bằng tiếng Việt đơn giản. Giữ nguyên rule_code, không thêm lỗi, "
                        "không thêm hoặc sửa căn cứ pháp lý. Trả đủ đúng một item cho mỗi lỗi đầu vào."
                    ),
                },
                {"role": "user", "content": json.dumps(issues, ensure_ascii=False)},
            ],
            text_format=IssueRewriteBatch,
        )
        return self._parsed(response, IssueRewriteBatch)

    def review_exception(self, form_data: dict[str, Any], trusted_context: str) -> LlmConcernBatch:
        response = self.client.responses.parse(
            model=settings.openai_assistant_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Chỉ nêu điểm bất thường chưa được rule engine bao phủ từ dữ liệu đã cho. "
                        "Không kết luận hồ sơ sai, không nêu căn cứ pháp lý, không lặp lỗi có sẵn. "
                        "Mỗi cảnh báo phải yêu cầu cán bộ hộ tịch xác nhận trực tiếp. Có thể trả items rỗng.\n"
                        f"TRUSTED_CONTEXT:\n{trusted_context}"
                    ),
                },
                {"role": "user", "content": json.dumps(form_data, ensure_ascii=False, default=str)},
            ],
            text_format=LlmConcernBatch,
        )
        return self._parsed(response, LlmConcernBatch)

