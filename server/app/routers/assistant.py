import logging
import time

from fastapi import APIRouter, HTTPException
from openai import OpenAIError

from ..config_store import llm_config
from ..llm_client import create_llm_text
from ..models import AutocompleteRequest, AutocompleteResponse, RewriteRequest, RewriteResponse
from ..services.autocomplete import llm_autocomplete
from ..services.rewrite import MODE_INSTRUCTIONS, SYSTEM_PROMPT

router = APIRouter()
logger = logging.getLogger("ig-chat-assistant")


@router.post("/autocomplete", response_model=AutocompleteResponse)
def autocomplete_message(payload: AutocompleteRequest) -> AutocompleteResponse:
    started_at = time.perf_counter()
    draft = payload.text.strip()
    last_message = payload.last_message.strip()
    style = payload.style.strip().lower() or "ig"
    logger.info(
        "autocomplete.start draft_len=%s last_message_len=%s style=%s session_id=%s session_name=%s",
        len(draft),
        len(last_message),
        style,
        payload.session_id,
        payload.session_name,
    )
    try:
        logger.info("autocomplete.history count=%s", len(payload.message_history))
        result = llm_autocomplete(draft, last_message, style, payload.message_history)
    except OpenAIError as exc:
        logger.exception("autocomplete.openai_error")
        raise HTTPException(status_code=502, detail=f"Autocomplete LLM error: {exc}") from exc

    total_ms = (time.perf_counter() - started_at) * 1000
    logger.info("autocomplete.end suggestion_len=%s mocked=false total_ms=%.2f", len(result.suggestion), total_ms)
    return result


@router.post("/rewrite", response_model=RewriteResponse)
def rewrite_message(payload: RewriteRequest) -> RewriteResponse:
    logger.info("rewrite.start mode=%s text_len=%s", payload.mode, len(payload.text.strip()))
    source = payload.text.strip()
    if not source:
        logger.warning("rewrite.invalid reason=empty_text")
        raise HTTPException(status_code=422, detail="Message text cannot be empty.")

    try:
        rewritten = create_llm_text(SYSTEM_PROMPT, f"{MODE_INSTRUCTIONS[payload.mode]}\n\nMessage:\n{source}")
    except OpenAIError as exc:
        logger.exception("rewrite.openai_error mode=%s", payload.mode)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc

    if not rewritten:
        logger.error("rewrite.empty_response mode=%s", payload.mode)
        raise HTTPException(status_code=502, detail="OpenAI returned an empty rewrite.")

    logger.info("rewrite.end mode=%s output_len=%s", payload.mode, len(rewritten))
    return RewriteResponse(text=rewritten, mode=payload.mode, model=str(llm_config["model"]))
