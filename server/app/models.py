from enum import Enum

from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: str = Field(..., max_length=20)
    content: str = Field(..., max_length=1000)


class RewriteMode(str, Enum):
    fix = "fix"
    refine = "refine"
    friendly = "friendly"
    concise = "concise"


class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    mode: RewriteMode = RewriteMode.refine


class RewriteResponse(BaseModel):
    text: str
    mode: RewriteMode
    model: str


class AutocompleteRequest(BaseModel):
    text: str = Field("", max_length=4000)
    last_message: str = Field("", max_length=4000)
    message_history: list[ChatHistoryItem] = Field(default_factory=list)
    style: str = Field("ig", max_length=20)
    session_id: str = Field("", max_length=120)
    session_name: str = Field("", max_length=120)


class AutocompleteResponse(BaseModel):
    suggestion: str
    mocked: bool = False
    cleaned_history: list[ChatHistoryItem] = Field(default_factory=list)


class LlmConfigPublic(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4.1-mini"
    base_url: str = ""
    api_key_configured: bool = False
    api_key_preview: str = ""
    temperature: float = 0.25
    max_output_tokens: int = 350
    api_mode: str = "chat_completions"
    reasoning_effort: str = ""
    thinking: str = "disabled"
    autocomplete_rule: str = ""


class LlmConfigUpdate(BaseModel):
    provider: str = Field("openai", max_length=50)
    model: str = Field(..., min_length=1, max_length=200)
    base_url: str = Field("", max_length=500)
    api_key: str = Field("", max_length=500)
    temperature: float = Field(0.25, ge=0, le=2)
    max_output_tokens: int = Field(350, ge=16, le=4000)
    api_mode: str = Field("chat_completions", max_length=50)
    reasoning_effort: str = Field("", max_length=20)
    thinking: str = Field("disabled", max_length=20)
    autocomplete_rule: str = Field("", max_length=4000)


class ConfigTestRequest(BaseModel):
    text: str = Field("Hello from Instagram Chat Assistant.", min_length=1, max_length=500)


class ConfigTestResponse(BaseModel):
    ok: bool
    message: str
    model: str
