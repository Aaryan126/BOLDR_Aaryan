from __future__ import annotations

from functools import lru_cache

from app.intelligence.drafting import evaluate_drafts, generate_ticket_draft
from app.models.drafting import DraftApproval, DraftEvaluation, DraftReviewRequest, TicketDraft
from app.services.classifications import get_ticket_classification, get_ticket_classifications
from app.services.retrieval import search_ticket_evidence

_APPROVALS: dict[str, DraftApproval] = {}


@lru_cache
def get_generated_ticket_drafts() -> tuple[TicketDraft, ...]:
    drafts: list[TicketDraft] = []
    for classification in get_ticket_classifications():
        retrieval = search_ticket_evidence(classification.ticket_id)
        if retrieval is None:
            continue
        drafts.append(generate_ticket_draft(classification, retrieval))
    return tuple(drafts)


def list_ticket_drafts() -> list[TicketDraft]:
    return [apply_saved_approval(draft) for draft in get_generated_ticket_drafts()]


def get_ticket_draft(ticket_id: str) -> TicketDraft | None:
    normalized_ticket_id = ticket_id.upper()
    draft = next(
        (
            item
            for item in get_generated_ticket_drafts()
            if item.ticket_id.upper() == normalized_ticket_id
        ),
        None,
    )
    return apply_saved_approval(draft) if draft else None


def get_draft_evaluation() -> DraftEvaluation:
    return evaluate_drafts(list_ticket_drafts())


def review_ticket_draft(ticket_id: str, review: DraftReviewRequest) -> TicketDraft | None:
    draft = get_ticket_draft(ticket_id)
    if draft is None:
        return None

    approval = DraftApproval(
        status=review.status,
        reviewer_note=review.reviewer_note,
        edited_reply=review.edited_reply if review.status == "edited_and_approved" else None,
        reason_codes=review.reason_codes,
        factual_corrections_made=review.factual_corrections_made,
    )
    _APPROVALS[draft.ticket_id] = approval
    return draft.model_copy(update={"approval": approval})


def apply_saved_approval(draft: TicketDraft) -> TicketDraft:
    approval = _APPROVALS.get(draft.ticket_id)
    if approval is None:
        return draft
    return draft.model_copy(update={"approval": approval})
