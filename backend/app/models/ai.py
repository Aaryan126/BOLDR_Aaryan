from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.classification import OperationalTag, RequiredPersona

ChatRole = Literal["system", "user", "assistant"]
ReplyType = Literal["customer_reply", "holding_reply", "internal_note"]
GapPriority = Literal["low", "medium", "high"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class AIUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ChatCompletionResult(BaseModel):
    provider: str
    model: str
    content: str
    finish_reason: str | None = None
    usage: AIUsage | None = None
    raw_response_id: str | None = None


class AIProviderStatus(BaseModel):
    provider: str
    model: str
    base_url: str
    configured: bool
    live_enabled: bool
    timeout_seconds: float
    max_retries: int
    prompt_redaction_enabled: bool
    structured_schema_count: int


class AISchemaSummary(BaseModel):
    name: str
    prompt_version: str
    description: str
    json_schema: dict[str, Any]


class StructuredPromptPreview(BaseModel):
    prompt_version: str
    schema_name: str
    ticket_id: str
    redacted: bool
    messages: list[ChatMessage]


class IntentRefinementOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    refined_intent: str
    confidence: float = Field(ge=0, le=1)
    rationale: str
    additional_operational_tags: list[OperationalTag] = Field(default_factory=list)
    requires_human_review: bool


class PersonaReasoningOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    persona: RequiredPersona
    confidence: float = Field(ge=0, le=1)
    trigger_terms: list[str]
    reasoning: str
    marketing_angle: str | None = None


class EvidenceSufficiencyOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    sufficient_evidence: bool
    confidence: float = Field(ge=0, le=1)
    supported_claims: list[str] = Field(default_factory=list)
    unsupported_claims: list[str] = Field(default_factory=list)
    required_human_inputs: list[str] = Field(default_factory=list)
    rationale: str


class DraftReplyOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    reply_type: ReplyType
    draft_reply: str
    evidence_ids: list[str] = Field(default_factory=list)
    claims: list[str] = Field(default_factory=list)
    approval_status: Literal["draft", "needs_review"] = "draft"


class GapRecordOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    gap_theme: str
    gap_question: str
    owner: str
    priority: GapPriority
    evidence_summary: str
    suggested_next_action: str


class KBDraftOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gap_theme: str
    faq_section: str
    question: str
    answer: str
    source_ticket_ids: list[str]
    confidence: float = Field(ge=0, le=1)
    reviewer_notes: str


class ThemeClusterOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_name: str
    primary_persona: RequiredPersona
    ticket_ids: list[str]
    summary: str
    recurring_questions: list[str]
    recommended_actions: list[str]


class MarketingBriefOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    period: str
    title: str
    executive_summary: str
    themes: list[ThemeClusterOutput]
    recommendations: list[str]
    source_ticket_ids: list[str]
