import logging

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from openai import OpenAIError

from ..config_store import llm_config, public_llm_config, update_llm_config
from ..llm_client import create_llm_text
from ..models import ConfigTestRequest, ConfigTestResponse, LlmConfigPublic, LlmConfigUpdate
from ..pages import CONFIG_PAGE_HTML

router = APIRouter()
logger = logging.getLogger("ig-chat-assistant")


@router.get("/api/config", response_model=LlmConfigPublic)
def get_config() -> LlmConfigPublic:
    logger.info("config.get")
    return public_llm_config()


@router.post("/api/config", response_model=LlmConfigPublic)
def save_config(payload: LlmConfigUpdate) -> LlmConfigPublic:
    return update_llm_config(payload)


@router.post("/api/config/test", response_model=ConfigTestResponse)
def test_config(payload: ConfigTestRequest) -> ConfigTestResponse:
    logger.info("config.test.start text_len=%s", len(payload.text))
    try:
        message = create_llm_text(
            "Reply with one short sentence confirming the LLM configuration works.",
            payload.text,
            max_output_tokens=max(200, min(int(llm_config["max_output_tokens"]), 600)),
            reasoning_fallback=True,
        )
    except OpenAIError as exc:
        logger.exception("config.test.openai_error")
        from fastapi import HTTPException

        raise HTTPException(status_code=502, detail=f"LLM test failed: {exc}") from exc

    logger.info("config.test.end output_len=%s", len(message))
    return ConfigTestResponse(ok=bool(message), message=message or "No text returned.", model=str(llm_config["model"]))


@router.get("/config", response_class=HTMLResponse)
def config_page() -> HTMLResponse:
    logger.info("config.page")
    return HTMLResponse(CONFIG_PAGE_HTML)
