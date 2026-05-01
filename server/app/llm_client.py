import logging
import time

from fastapi import HTTPException
from openai import OpenAI

from .config_store import llm_config
from .metrics_store import record_llm_metric

logger = logging.getLogger("ig-chat-assistant")


def get_openai_client() -> OpenAI | None:
    api_key = str(llm_config.get("api_key", ""))
    if not api_key:
        return None
    base_url = str(llm_config.get("base_url", "")).strip()
    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    return OpenAI(api_key=api_key)


def create_llm_text(
    system_prompt: str,
    user_text: str,
    max_output_tokens: int | None = None,
    *,
    reasoning_fallback: bool = False,
    thinking_override: str | None = None,
) -> str:
    client = get_openai_client()
    if client is None:
        raise HTTPException(status_code=500, detail="API key is not configured.")

    api_mode = str(llm_config.get("api_mode", "chat_completions"))
    provider = str(llm_config.get("provider", "openai"))
    model = str(llm_config["model"])
    temperature = float(llm_config["temperature"])
    token_limit = max_output_tokens or int(llm_config["max_output_tokens"])
    started_at = time.perf_counter()

    def record_metric(ok: bool, output_text: str = "", error: str = "") -> None:
        latency_ms = (time.perf_counter() - started_at) * 1000
        record_llm_metric(
            {
                "ok": ok,
                "provider": provider,
                "model": model,
                "api_mode": api_mode,
                "latency_ms": round(latency_ms, 2),
                "input_chars": len(system_prompt) + len(user_text),
                "output_chars": len(output_text),
                "temperature": temperature,
                "max_output_tokens": token_limit,
                "error": error[:300],
            }
        )

    try:
        if api_mode == "responses":
            response = client.responses.create(
                model=model,
                instructions=system_prompt,
                input=user_text,
                temperature=temperature,
                max_output_tokens=token_limit,
            )
            output = (response.output_text or "").strip()
            record_metric(True, output)
            return output

        request_kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            "temperature": temperature,
            "max_tokens": token_limit,
            "stream": False,
        }
        reasoning_effort = str(llm_config.get("reasoning_effort", "")).strip()
        thinking = thinking_override if thinking_override is not None else str(llm_config.get("thinking", "disabled")).strip()
        if reasoning_effort and thinking != "disabled":
            request_kwargs["reasoning_effort"] = reasoning_effort
        if thinking in {"enabled", "disabled"}:
            request_kwargs["extra_body"] = {"thinking": {"type": thinking}}

        response = client.chat.completions.create(**request_kwargs)
        message = response.choices[0].message
        content = getattr(message, "content", None) or ""
        if content:
            output = content.strip()
            record_metric(True, output)
            return output

        reasoning_content = getattr(message, "reasoning_content", None) or ""
        if reasoning_fallback and reasoning_content:
            logger.info("llm.chat.used_reasoning_content length=%s", len(reasoning_content))
            output = reasoning_content.strip()
            record_metric(True, output)
            return output
        record_metric(True, "")
        return ""
    except Exception as exc:
        record_metric(False, error=f"{type(exc).__name__}: {exc}")
        raise
