from ..models import RewriteMode

SYSTEM_PROMPT = """You rewrite short Instagram Direct messages.
Preserve the user's meaning, language, names, emojis, and casual tone.
Return only the rewritten message, with no labels, quotes, markdown, or commentary.
Do not add new facts, promises, flirting, apologies, or intensity that the user did not imply."""

MODE_INSTRUCTIONS = {
    RewriteMode.fix: "Correct spelling, grammar, punctuation, and obvious typos. Keep wording as close as possible.",
    RewriteMode.refine: "Make it sound natural, clear, and polished while keeping it casual.",
    RewriteMode.friendly: "Make it warmer and friendlier without becoming overly enthusiastic.",
    RewriteMode.concise: "Make it shorter and clearer while preserving the message.",
}
