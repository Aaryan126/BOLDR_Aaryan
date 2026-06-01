from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.ai import DraftReplyOutput, EvidenceSufficiencyOutput, GapRecordOutput, ReplyType
from app.models.classification import AnswerabilityState, RequiredPersona

ApprovalStatus = Literal[
    "draft",
    "needs_review",
    "approved",
    "edited_and_approved",
    "rejected",
    "sent_or_exported",
]


class GuardrailCheck(BaseModel):
    name: str
    passed: bool
    message: str


class EvidenceTrace(BaseModel):
    evidence_id: str
    source_file: str
    source_type: str
    section_title: str
    excerpt: str
    supports_answer: bool


class AnswerabilityDecision(BaseModel):
    ticket_id: str
    answerability: AnswerabilityState
    reply_type: ReplyType
    customer_facing: bool
    can_send_to_customer: bool
    evidence_sufficient: bool
    judge_method: str
    reasons: list[str]
    required_human_inputs: list[str] = Field(default_factory=list)
    unsupported_terms: list[str] = Field(default_factory=list)


class DraftApproval(BaseModel):
    status: ApprovalStatus
    reviewer_note: str | None = None
    edited_reply: str | None = None
    reason_codes: list[str] = Field(default_factory=list)
    factual_corrections_made: bool = False


class DraftReviewRequest(BaseModel):
    status: Literal["approved", "edited_and_approved", "rejected"]
    reviewer_note: str | None = None
    edited_reply: str | None = None
    reason_codes: list[str] = Field(default_factory=list)
    factual_corrections_made: bool = False


class ClaimEvidenceLink(BaseModel):
    evidence_id: str
    source_file: str
    snippet: str


class ClaimVerification(BaseModel):
    sentence: str
    sentence_type: Literal["factual_claim", "procedural_or_next_step", "politeness_or_non_factual"]
    verdict: Literal["supported", "unsupported", "contradicted", "not_applicable"]
    evidence_links: list[ClaimEvidenceLink] = Field(default_factory=list)
    contradiction_sources: list[str] = Field(default_factory=list)
    notes: str | None = None


class SafetyDecision(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    requires_human_review: bool
    downgrade_applied: bool
    downgrade_reason: str | None = None
    recommended_action: str | None = None


class TicketDraft(BaseModel):
    ticket_id: str
    persona: RequiredPersona
    intent: str
    decision: AnswerabilityDecision
    evidence_sufficiency: EvidenceSufficiencyOutput
    draft: DraftReplyOutput
    gap_record: GapRecordOutput | None = None
    evidence_trace: list[EvidenceTrace]
    guardrails: list[GuardrailCheck]
    claim_verification: list[ClaimVerification] = Field(default_factory=list)
    safety_decision: SafetyDecision | None = None
    failure_modes: list[str] = Field(default_factory=list)
    approval: DraftApproval


class DraftEvaluation(BaseModel):
    total_tickets: int
    generated_ticket_count: int
    customer_reply_count: int
    holding_reply_count: int
    internal_note_count: int
    answerable_draft_count: int
    blocked_unsupported_count: int
    order_lookup_note_count: int
    guardrail_failures_count: int
    evidence_backed_customer_reply_count: int
    approval_status_counts: dict[str, int]
    claim_grounding_rate: float
    contradiction_detection_rate: float
    false_safe_rate: float
    abstention_usefulness_rate: float
    high_risk_claim_unsupported_rate: float
