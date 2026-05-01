import logging

from fastapi import APIRouter

from ..config_store import public_llm_config

router = APIRouter()
logger = logging.getLogger("ig-chat-assistant")


@router.get("/health")
def health() -> dict[str, str | bool]:
    public_config = public_llm_config()
    logger.info("health model=%s openai_configured=%s", public_config.model, public_config.api_key_configured)
    return {"status": "ok", "model": public_config.model, "openai_configured": public_config.api_key_configured}
