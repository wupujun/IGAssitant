import logging
import time

from ..llm_client import create_llm_text
from ..config_store import llm_config
from ..models import AutocompleteResponse, ChatHistoryItem


logger = logging.getLogger("ig-chat-assistant")

AUTOCOMPLETE_SYSTEM_PROMPT = """You are an Instagram DM writing assistant.
Your output will be inserted as the user's reply.
Return only the corrected or completed version of the user's current draft.
Use the latest received message only as private context to infer the most likely intended reply.
Do not summarize, quote, answer, or repeat the latest received message.
Fix spelling, grammar, syntax, punctuation, and wording issues in the current draft.
If the draft is incomplete, complete it as a natural reply based on the context.
Preserve any text inside double quotes exactly as the user typed it; do not translate, correct, rewrite, reword, or change capitalization/punctuation inside quoted text.
Preserve the user's language, casual tone, names, emojis, and intent whenever possible.
Do not add facts, promises, flirting, apologies, or intensity that are not implied.
Return only one reply message. No labels, quotes, markdown, alternatives, explanations, or context."""

STYLE_INSTRUCTIONS = {
    "ig": "Style: Instagram DM. Keep it casual, direct, friendly, and natural for a private chat.",
    "tiktok": "Style: TikTok comment or DM. Keep it short, punchy, casual, and expressive without overdoing slang.",
    "reddit": "Style: Reddit reply. Keep it clear, conversational, grounded, and slightly more explanatory if useful.",
}


def normalize_style(style: str) -> str:
    value = (style or "ig").strip().lower()
    return value if value in STYLE_INSTRUCTIONS else "ig"


def build_autocomplete_input(
    draft: str,
    last_message: str,
    style: str,
) -> str:
    context = last_message or "No latest received message was detected."
    style_key = normalize_style(style)
    custom_rule = str(llm_config.get("autocomplete_rule", "")).strip()
    rule_block = f"User custom correction/autocomplete rule:\n{custom_rule}\n\n" if custom_rule else ""
    return (
        f"{STYLE_INSTRUCTIONS[style_key]}\n\n"
        f"{rule_block}"
        "Latest received message. Use as private context only; do not include it in the output:\n"
        f"{context}\n\n"
        "User's current draft to correct or complete:\n"
        f"{draft}"
    )


def llm_autocomplete(
    draft: str,
    last_message: str,
    style: str,
    message_history: list[ChatHistoryItem],
) -> AutocompleteResponse:
    started_at = time.perf_counter()
    suggestion = create_llm_text(
        AUTOCOMPLETE_SYSTEM_PROMPT,
        build_autocomplete_input(draft, last_message, style),
        max_output_tokens=220,
        thinking_override="disabled",
    )
    llm_ms = (time.perf_counter() - started_at) * 1000
    logger.info("autocomplete.metrics llm_ms=%.2f draft_len=%s last_message_len=%s history_sent=%s", llm_ms, len(draft), len(last_message), len(message_history))
    return AutocompleteResponse(suggestion=suggestion.strip(), mocked=False, cleaned_history=[])
