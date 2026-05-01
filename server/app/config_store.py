import json
import logging
import os
from pathlib import Path
from typing import Any

from .models import LlmConfigPublic, LlmConfigUpdate

logger = logging.getLogger("ig-chat-assistant")

SERVER_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = SERVER_DIR / "llm_config.json"


def _default_config() -> dict[str, Any]:
    return {
        "provider": os.getenv("LLM_PROVIDER", "openai"),
        "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        "base_url": os.getenv("OPENAI_BASE_URL", ""),
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.25")),
        "max_output_tokens": int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "350")),
        "api_mode": os.getenv("LLM_API_MODE", "chat_completions"),
        "reasoning_effort": os.getenv("LLM_REASONING_EFFORT", ""),
        "thinking": os.getenv("LLM_THINKING", "disabled"),
        "autocomplete_rule": os.getenv("AUTOCOMPLETE_RULE", ""),
    }


def load_llm_config() -> dict[str, Any]:
    config = _default_config()
    if not CONFIG_PATH.exists():
        return config

    try:
        saved = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.exception("config.load_failed path=%s", CONFIG_PATH)
        return config

    config.update({key: value for key, value in saved.items() if key in config})
    logger.info(
        "config.loaded path=%s model=%s base_url_configured=%s",
        CONFIG_PATH,
        config["model"],
        bool(config["base_url"]),
    )
    return config


llm_config: dict[str, Any] = load_llm_config()


def save_llm_config(config: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")
    logger.info(
        "config.saved path=%s provider=%s model=%s base_url_configured=%s api_key_configured=%s",
        CONFIG_PATH,
        config["provider"],
        config["model"],
        bool(config["base_url"]),
        bool(config["api_key"]),
    )


def mask_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "****"
    return f"{api_key[:4]}...{api_key[-4:]}"


def public_llm_config() -> LlmConfigPublic:
    api_key = str(llm_config.get("api_key", ""))
    return LlmConfigPublic(
        provider=str(llm_config.get("provider", "openai")),
        model=str(llm_config.get("model", "gpt-4.1-mini")),
        base_url=str(llm_config.get("base_url", "")),
        api_key_configured=bool(api_key),
        api_key_preview=mask_api_key(api_key),
        temperature=float(llm_config.get("temperature", 0.25)),
        max_output_tokens=int(llm_config.get("max_output_tokens", 350)),
        api_mode=str(llm_config.get("api_mode", "chat_completions")),
        reasoning_effort=str(llm_config.get("reasoning_effort", "")),
        thinking=str(llm_config.get("thinking", "disabled")),
        autocomplete_rule=str(llm_config.get("autocomplete_rule", "")),
    )


def update_llm_config(payload: LlmConfigUpdate) -> LlmConfigPublic:
    api_key = payload.api_key.strip() or str(llm_config.get("api_key", ""))
    llm_config.update(
        {
            "provider": payload.provider.strip() or "openai",
            "model": payload.model.strip(),
            "base_url": payload.base_url.strip(),
            "api_key": api_key,
            "temperature": payload.temperature,
            "max_output_tokens": payload.max_output_tokens,
            "api_mode": payload.api_mode.strip() or "chat_completions",
            "reasoning_effort": payload.reasoning_effort.strip(),
            "thinking": payload.thinking.strip() or "disabled",
            "autocomplete_rule": payload.autocomplete_rule.strip(),
        }
    )
    save_llm_config(llm_config)
    logger.info("config.update model=%s base_url_configured=%s", llm_config["model"], bool(llm_config["base_url"]))
    return public_llm_config()
