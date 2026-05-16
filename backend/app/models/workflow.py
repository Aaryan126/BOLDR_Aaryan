from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.ai import KBDraftOutput, ReplyType
from app.models.classification import AnswerabilityState, RequiredPersona, TicketClassification
from app.models.dataset import TicketRecord
from app.models.drafting import ApprovalStatus, TicketDraft
from app.models.retrieval import RetrievalResult

WorkflowRunType = Literal["single_ticket", "batch"]
GapStatus = Literal[
    "new",
    "needs_human_answer",
    "awaiting_supplier",
    "resolved_needs_kb_draft",
    "kb_draft_ready",
    "approved",
    "rejected",
]
GapResolutionStatus = Literal[
    "needs_human_answer",
    "awaiting_supplier",
    "resolved_needs_kb_draft",
]
KBDraftReviewStatus = Literal["approved", "rejected"]


class WorkflowOverview(BaseModel):
    phase: str
    stable_endpoint_count: int
    ticket_count: int
    draft_count: int
    gap_count: int
    process_run_count: int
    approval_queue_count: int
    unresolved_gap_count: int
    kb_draft_ready_count: int
    approved_gap_count: int
    rejected_gap_count: int
    supported_review_actions: list[str]


class TicketWorkflowSummary(BaseModel):
    ticket_id: str
    date_received: str
    subject: str
    channel: str
    status: str
    persona: RequiredPersona
    intent: str
    answerability: AnswerabilityState
    reply_type: ReplyType
    approval_status: ApprovalStatus
    requires_escalation: bool
    evidence_count: int
    guardrail_failures: int
    gap_id: str | None = None


class TicketWorkflowDetail(BaseModel):
    workflow: TicketWorkflowSummary
    ticket: TicketRecord
    classification: TicketClassification
    retrieval: RetrievalResult
    draft: TicketDraft


class TicketListMeta(BaseModel):
    total: int
    returned: int
    filters: dict[str, str]
    answerability_counts: dict[str, int]
    reply_type_counts: dict[str, int]
    approval_status_counts: dict[str, int]


class TicketListResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[TicketWorkflowSummary]
    meta: TicketListMeta


class TicketDetailResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: TicketWorkflowDetail


class TicketProcessRequest(BaseModel):
    force_refresh: bool = False


class BatchProcessRequest(BaseModel):
    ticket_ids: list[str] | None = None
    limit: int | None = Field(default=None, ge=1, le=70)
    force_refresh: bool = False


class WorkflowRunSummary(BaseModel):
    run_id: str
    run_type: WorkflowRunType
    created_at: str
    processed_ticket_count: int
    ticket_ids: list[str]
    missing_ticket_ids: list[str] = Field(default_factory=list)
    customer_reply_count: int
    holding_reply_count: int
    internal_note_count: int
    gap_count: int
    guardrail_failures_count: int


class TicketProcessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: TicketWorkflowDetail
    meta: WorkflowRunSummary


class BatchProcessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[TicketWorkflowSummary]
    meta: WorkflowRunSummary


class KnowledgeGapRecord(BaseModel):
    gap_id: str
    gap_theme: str
    status: GapStatus
    source_ticket_ids: list[str]
    frequency: int
    persona_counts: dict[str, int]
    owner: str
    priority: Literal["low", "medium", "high"]
    gap_questions: list[str]
    evidence_summary: str
    suggested_next_action: str
    suggested_faq_section: str
    product_page_update_needed: bool
    marketing_signal: bool
    human_resolution: str | None = None
    reviewer_note: str | None = None
    kb_draft: KBDraftOutput | None = None
    kb_review_note: str | None = None
    kb_reviewed_at: str | None = None
    updated_at: str | None = None


class GapListMeta(BaseModel):
    total: int
    returned: int
    filters: dict[str, str]
    status_counts: dict[str, int]
    priority_counts: dict[str, int]


class GapListResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[KnowledgeGapRecord]
    meta: GapListMeta


class GapDetailResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: KnowledgeGapRecord


class GapResolutionRequest(BaseModel):
    human_resolution: str = Field(min_length=3)
    status: GapResolutionStatus = "resolved_needs_kb_draft"
    owner: str | None = None
    reviewer_note: str | None = None


class KBDraftReviewRequest(BaseModel):
    status: KBDraftReviewStatus
    reviewer_note: str | None = None


class GapKBDraftResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: KnowledgeGapRecord


class GapThemeMetric(BaseModel):
    gap_id: str
    gap_theme: str
    frequency: int
    priority: Literal["low", "medium", "high"]
    status: GapStatus
    marketing_signal: bool
    product_page_update_needed: bool


class GapMetrics(BaseModel):
    total_gaps: int
    unresolved_gap_count: int
    kb_draft_ready_count: int
    approved_count: int
    rejected_count: int
    product_page_update_needed_count: int
    marketing_signal_count: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    by_owner: dict[str, int]
    by_persona: dict[str, int]
    top_themes: list[GapThemeMetric]


class GapMetricsResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: GapMetrics
