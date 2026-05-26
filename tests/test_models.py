import pytest
from pydantic import ValidationError

from server.app.models import AutocompleteRequest, LlmConfigUpdate, RewriteMode, RewriteRequest


def test_rewrite_request_rejects_empty_text() -> None:
    with pytest.raises(ValidationError):
        RewriteRequest(text="", mode=RewriteMode.refine)


def test_rewrite_request_rejects_oversized_text() -> None:
    with pytest.raises(ValidationError):
        RewriteRequest(text="x" * 4001, mode=RewriteMode.fix)


def test_autocomplete_request_bounds_history_items() -> None:
    with pytest.raises(ValidationError):
        AutocompleteRequest(
            text="hello",
            message_history=[
                {
                    "role": "assistant",
                    "content": "x" * 1001,
                }
            ],
        )


def test_config_update_bounds_runtime_values() -> None:
    with pytest.raises(ValidationError):
        LlmConfigUpdate(model="gpt-test", temperature=2.1)

    with pytest.raises(ValidationError):
        LlmConfigUpdate(model="gpt-test", max_output_tokens=5000)

