import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.config import settings
from app.main import app
from app.routers.admin import pagination, require_admin


def test_admin_api_rejects_wrong_key_and_accepts_configured_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "admin_api_key", "demo-secret")
    with pytest.raises(HTTPException) as error:
        require_admin(HTTPAuthorizationCredentials(scheme="Bearer", credentials="wrong"))
    assert error.value.status_code == 401
    assert require_admin(HTTPAuthorizationCredentials(scheme="Bearer", credentials="demo-secret")) is None


def test_admin_pagination_clamps_page_after_delete() -> None:
    assert pagination(total=21, requested_page=3, page_size=10) == (3, 3, 20)
    assert pagination(total=20, requested_page=3, page_size=10) == (2, 2, 10)
    assert pagination(total=0, requested_page=8, page_size=10) == (1, 1, 0)


def test_admin_cannot_create_empty_session() -> None:
    assert "/admin/sessions" not in app.openapi()["paths"]
