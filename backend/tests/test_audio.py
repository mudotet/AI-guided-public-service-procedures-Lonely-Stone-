from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers.intake import MAX_AUDIO_BYTES, validate_audio
from app.services.openai_client import OpenAIClient


def test_audio_validation_accepts_media_recorder_webm_codec() -> None:
    assert validate_audio("audio/webm;codecs=opus", b"audio") == ("audio/webm", "webm")


@pytest.mark.parametrize(
    ("content_type", "audio", "status_code"),
    [
        ("text/plain", b"audio", 415),
        ("audio/webm", b"", 422),
        ("audio/webm", b"x" * (MAX_AUDIO_BYTES + 1), 413),
    ],
)
def test_audio_validation_rejects_invalid_uploads(content_type: str, audio: bytes, status_code: int) -> None:
    with pytest.raises(HTTPException) as error:
        validate_audio(content_type, audio)
    assert error.value.status_code == status_code


def test_transcription_is_guided_to_vietnamese() -> None:
    request: dict[str, object] = {}
    client = OpenAIClient.__new__(OpenAIClient)
    client.client = SimpleNamespace(
        audio=SimpleNamespace(
            transcriptions=SimpleNamespace(
                create=lambda **kwargs: (request.update(kwargs) or SimpleNamespace(text="Tiếng Việt"))
            )
        )
    )

    assert client.transcribe("audio.webm", b"audio", "audio/webm") == "Tiếng Việt"
    assert request["language"] == "vi"
    assert "không dịch sang ngôn ngữ khác" in str(request["prompt"])


def test_conversation_response_is_length_limited() -> None:
    request: dict[str, object] = {}
    client = OpenAIClient.__new__(OpenAIClient)
    client.client = SimpleNamespace(
        responses=SimpleNamespace(
            create=lambda **kwargs: (request.update(kwargs) or SimpleNamespace(output_text="Câu trả lời"))
        )
    )

    result = client.converse([{"role": "user", "content": "Xin hướng dẫn"}], "Thông tin")

    assert result == "Câu trả lời"
    assert request["max_output_tokens"] == 180
