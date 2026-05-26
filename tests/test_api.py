from fastapi.testclient import TestClient

from server.app.factory import create_app
from server.app.models import AutocompleteResponse
from server.app.routers import assistant as assistant_router


def make_client() -> TestClient:
    return TestClient(create_app())


def test_health_reports_public_config() -> None:
    response = make_client().get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "model" in body
    assert "openai_configured" in body


def test_config_response_never_returns_raw_api_key() -> None:
    response = make_client().get("/api/config")

    assert response.status_code == 200
    body = response.json()
    assert "api_key" not in body
    assert "api_key_configured" in body
    assert "api_key_preview" in body


def test_autocomplete_uses_mocked_service(monkeypatch) -> None:
    def fake_autocomplete(draft, last_message, style, message_history) -> AutocompleteResponse:
        assert draft == "hello"
        assert last_message == "hi"
        assert style == "ig"
        assert message_history == []
        return AutocompleteResponse(suggestion="hello back", mocked=True, cleaned_history=[])

    monkeypatch.setattr(assistant_router, "llm_autocomplete", fake_autocomplete)

    response = make_client().post(
        "/autocomplete",
        json={
            "text": " hello ",
            "last_message": " hi ",
            "style": "ig",
            "message_history": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["suggestion"] == "hello back"


def test_rewrite_rejects_blank_text_before_llm_call(monkeypatch) -> None:
    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("LLM client should not be called for blank input")

    monkeypatch.setattr(assistant_router, "create_llm_text", fail_if_called)

    response = make_client().post("/rewrite", json={"text": "   ", "mode": "fix"})

    assert response.status_code == 422


def test_logs_limit_is_clamped() -> None:
    response = make_client().get("/api/logs?limit=999999")

    assert response.status_code == 200
    assert len(response.json()["logs"]) <= 500
