import json
from collections.abc import Sequence
from functools import lru_cache
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.config import settings
from app.schemas import CaseClassification, LlmConcernBatch

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
                "Bạn là trợ lý hướng dẫn đăng ký khai sinh, viết tiếng Việt ngắn gọn, dễ hiểu, tối đa 100 từ. "
                "Chỉ dùng dữ kiện và căn cứ trong TRUSTED_CONTEXT; không tự tạo điều luật, giấy tờ "
                "hoặc kết luận thẩm quyền. Nếu thiếu dữ liệu, hỏi đúng một câu rõ nhất. Nếu thuộc case "
                "hiếm hoặc không chắc chắn, nói nguyên văn: 'Cần cán bộ hộ tịch xác nhận trực tiếp'. "
                "Khi một trường hợp vừa được xác định, giải thích ngắn gọn tên trường hợp có nghĩa gì "
                "và dữ kiện nào của người dùng dẫn đến kết quả đó; không nhắc mã case nội bộ. Nếu có "
                "nhiều trường hợp, giải thích từng trường hợp.\n\n"
                f"TRUSTED_CONTEXT:\n{trusted_context}"
            ),
            input=list(messages),
            max_output_tokens=180,
        )
        return response.output_text

    def transcribe(self, filename: str, audio: bytes, content_type: str) -> str:
        response = self.client.audio.transcriptions.create(
            model=settings.openai_transcription_model,
            file=(filename, audio, content_type),
            language="vi",
            prompt=(
                "Người nói đang trả lời về thủ tục đăng ký khai sinh bằng tiếng Việt. "
                "Chép nguyên văn bằng chữ Quốc ngữ có dấu; không dịch sang ngôn ngữ khác. "
                "Các từ thường gặp: giấy chứng sinh, hộ tịch, cha, mẹ, trẻ em, quốc tịch, đăng ký kết hôn."
            ),
        )
        transcript = response.text.strip()
        if not transcript:
            raise RuntimeError("OpenAI returned an empty transcript")
        return transcript

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


@lru_cache
def get_openai_client() -> OpenAIClient:
    """Reuse the SDK HTTP connection pool across requests."""
    return OpenAIClient()
