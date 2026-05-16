from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.ai import KBDraftOutput
from app.models.classification import TicketClassification
from app.models.dataset import TicketRecord
from app.models.drafting import ApprovalStatus, TicketDraft
from app.models.retrieval import RetrievalResult


TraceStatus = Literal["pending", "running", "completed", "blocked"]
EnquiryState = Literal[
    "awaiting_approval",
    "approved",
    "rejected",
    "needs_team_confirmation",
    "gap_resolved",
    "kb_draft_ready",
    "kb_approved",
    "kb_rejected",
]
DemoGapStatus = Literal[
    "needs_resolution",
    "resolved_needs_kb_draft",
    "kb_draft_ready",
    "approved",
    "rejected",
]


class TraceEvent(BaseModel):
    step: str
    status: TraceStatus
    title: str
    detail: str
    source_refs: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class AdhocEnquiryRequest(BaseModel):
    message: str = ""
    customer_name: str = "Demo Customer"
    customer_email: str = "demo.customer@example.com"
    source: str = "judge_demo"
    sample_ticket_id: str | None = None


class EnquiryApprovalRequest(BaseModel):
    status: Literal["approved", "edited_and_approved", "rejected"] = "approved"
    edited_reply: str | None = None
    reviewer_note: str | None = None


class EnquiryGapResolutionRequest(BaseModel):
    human_resolution: str = Field(min_length=3)
    owner: str | None = None
    reviewer_note: str | None = None


class EnquiryKBReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reviewer_note: str | None = None


class AdhocGapState(BaseModel):
    status: DemoGapStatus
    gap_theme: str
    missing_knowledge: str
    owner: str
    priority: Literal["low", "medium", "high"]
    suggested_next_action: str
    product_page_update_needed: bool
    marketing_signal: bool
    human_resolution: str | None = None
    reviewer_note: str | None = None
    kb_draft: KBDraftOutput | None = None
    kb_review_note: str | None = None
    kb_reviewed_at: str | None = None


class AdhocApprovalState(BaseModel):
    status: ApprovalStatus
    reviewer_note: str | None = None
    edited_reply: str | None = None
    approved_reply: str | None = None


class AdhocEnquiryRecord(BaseModel):
    enquiry_id: str
    created_at: str
    updated_at: str
    state: EnquiryState
    customer_name: str
    customer_email: str
    source: str
    sample_ticket_id: str | None = None
    ticket: TicketRecord
    classification: TicketClassification
    retrieval: RetrievalResult
    draft: TicketDraft
    approval_state: AdhocApprovalState
    gap_state: AdhocGapState | None = None
    processing_trace: list[TraceEvent]
    customer_visible_response: str | None = None

