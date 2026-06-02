from __future__ import annotations

import re
from collections import Counter
from datetime import UTC, datetime

from app.intelligence.classifier import classify_ticket
from app.intelligence.drafting import generate_ticket_draft
from app.models.ai import KBDraftOutput
from app.models.classification import RequiredPersona
from app.models.dataset import TicketRecord
from app.models.drafting import DraftApproval
from app.models.enquiry import (
    AdhocApprovalState,
    AdhocEnquiryRecord,
    AdhocEnquiryRequest,
    AdhocGapState,
    EnquiryApprovalRequest,
    EnquiryGapResolutionRequest,
    EnquiryKBReviewRequest,
    EnquiryResetResponse,
    TraceEvent,
)
from app.services.datasets import get_dataset_snapshot
from app.services.retrieval import get_evidence_retriever


class EnquiryTransitionError(ValueError):
    pass


_ENQUIRIES: dict[str, AdhocEnquiryRecord] = {}
_ENQUIRY_SEQUENCE = 0


SAMPLE_PRIORITY_PATTERNS = [
    re.compile(pattern, re.I)
    for pattern in [
        "bpa|safe for kids|hypoallergenic",
        "vegan|animal products",
        "carbon-neutral|carbon neutral|carbon footprint",
        "engraving|engrave|caseback",
        "service|regulation|battery",
        "strap compatibility|lug width|nato|quick-release|swap straps",
        "order|tracking|refund|cancel",
    ]
]


def create_enquiry(request: AdhocEnquiryRequest) -> AdhocEnquiryRecord:
    global _ENQUIRY_SEQUENCE

    sample_ticket = _find_sample_ticket(request.sample_ticket_id)
    raw_message = (sample_ticket.message_body if sample_ticket else request.message).strip()
    if not raw_message:
        raise ValueError("An enquiry message or sample_ticket_id is required.")

    _ENQUIRY_SEQUENCE += 1
    enquiry_id = f"ENQ-{_ENQUIRY_SEQUENCE:04d}"
    ticket = _build_synthetic_ticket(enquiry_id, request, raw_message, sample_ticket)
    classification = classify_ticket(ticket)
    retrieval = get_evidence_retriever().search_ticket(classification)
    draft = generate_ticket_draft(classification, retrieval, use_live_ai=None)

    source_refs = _source_refs(retrieval.evidence[:5])
    answerable = (
        draft.decision.reply_type == "customer_reply"
        and draft.decision.can_send_to_customer
        and draft.evidence_sufficiency.sufficient_evidence
    )

    if answerable:
        draft = _force_human_review(draft)
        state = "awaiting_approval"
        approval_state = AdhocApprovalState(status="needs_review")
        gap_state = None
        customer_visible_response = None
    else:
        state = "needs_team_confirmation"
        approval_state = AdhocApprovalState(status=draft.approval.status)
        gap_state = _build_gap_state(classification, retrieval, draft)
        customer_visible_response = None

    now = _now_iso()
    record = AdhocEnquiryRecord(
        enquiry_id=enquiry_id,
        created_at=now,
        updated_at=now,
        state=state,
        customer_name=ticket.customer_name,
        customer_email=ticket.customer_email,
        source=request.source,
        sample_ticket_id=sample_ticket.ticket_id if sample_ticket else request.sample_ticket_id,
        ticket=ticket,
        classification=classification,
        retrieval=retrieval,
        draft=draft,
        approval_state=approval_state,
        gap_state=gap_state,
        processing_trace=_build_trace(classification, retrieval, draft, source_refs, answerable),
        customer_visible_response=customer_visible_response,
    )
    _ENQUIRIES[enquiry_id] = record
    return record


def list_enquiries() -> list[AdhocEnquiryRecord]:
    return sorted(_ENQUIRIES.values(), key=lambda record: record.created_at)


def reset_enquiries() -> EnquiryResetResponse:
    global _ENQUIRY_SEQUENCE

    cleared_count = len(_ENQUIRIES)
    _ENQUIRIES.clear()
    _ENQUIRY_SEQUENCE = 0
    return EnquiryResetResponse(
        status="reset",
        cleared_count=cleared_count,
        next_enquiry_id="ENQ-0001",
    )


def get_enquiry(enquiry_id: str) -> AdhocEnquiryRecord | None:
    return _ENQUIRIES.get(enquiry_id.upper())


def review_enquiry_answer(
    enquiry_id: str,
    request: EnquiryApprovalRequest,
) -> AdhocEnquiryRecord | None:
    record = get_enquiry(enquiry_id)
    if record is None:
        return None
    if record.draft.decision.reply_type != "customer_reply":
        raise EnquiryTransitionError("Only answerable customer drafts can be reviewed here.")
    if record.state not in {"awaiting_approval", "approved", "rejected"}:
        raise EnquiryTransitionError("This enquiry is not in the approval queue.")

    if request.status == "rejected":
        approval = AdhocApprovalState(
            status="rejected",
            reviewer_note=request.reviewer_note,
            edited_reply=None,
            approved_reply=None,
            reason_codes=request.reason_codes,
            factual_corrections_made=request.factual_corrections_made,
        )
        updated = record.model_copy(
            update={
                "state": "rejected",
                "updated_at": _now_iso(),
                "approval_state": approval,
                "customer_visible_response": None,
            }
        )
    else:
        edited_reply = (request.edited_reply or "").strip() or None
        status = "edited_and_approved" if edited_reply else request.status
        approved_reply = edited_reply or record.draft.draft.draft_reply
        approval = AdhocApprovalState(
            status=status,
            reviewer_note=request.reviewer_note,
            edited_reply=edited_reply,
            approved_reply=approved_reply,
            reason_codes=request.reason_codes,
            factual_corrections_made=request.factual_corrections_made,
        )
        updated = record.model_copy(
            update={
                "state": "approved",
                "updated_at": _now_iso(),
                "approval_state": approval,
                "customer_visible_response": approved_reply,
            }
        )

    _ENQUIRIES[record.enquiry_id] = updated
    return updated


def resolve_enquiry_gap(
    enquiry_id: str,
    request: EnquiryGapResolutionRequest,
) -> AdhocEnquiryRecord | None:
    record = get_enquiry(enquiry_id)
    if record is None:
        return None
    if record.gap_state is None:
        raise EnquiryTransitionError("This enquiry does not have a CS gap to resolve.")

    human_resolution = _normalize_sentence(request.human_resolution)
    gap_state = record.gap_state.model_copy(
        update={
            "status": "resolved_needs_kb_draft",
            "human_resolution": human_resolution,
            "owner": request.owner or record.gap_state.owner,
            "reviewer_note": request.reviewer_note,
        }
    )
    updated = record.model_copy(
        update={
            "state": "gap_resolved",
            "updated_at": _now_iso(),
            "gap_state": gap_state,
            "customer_visible_response": human_resolution,
        }
    )
    _ENQUIRIES[record.enquiry_id] = updated
    return updated


def close_enquiry_gap(enquiry_id: str) -> AdhocEnquiryRecord | None:
    record = get_enquiry(enquiry_id)
    if record is None:
        return None
    if record.gap_state is None:
        raise EnquiryTransitionError("This enquiry does not have a CS gap to close.")
    if not record.gap_state.human_resolution:
        raise EnquiryTransitionError("Resolve the CS gap before closing it.")
    if record.gap_state.status != "resolved_needs_kb_draft":
        raise EnquiryTransitionError("Only a resolved CS gap can be closed without a KB draft.")

    gap_state = record.gap_state.model_copy(update={"status": "closed_without_kb"})
    updated = record.model_copy(
        update={
            "state": "gap_closed",
            "updated_at": _now_iso(),
            "gap_state": gap_state,
        }
    )
    _ENQUIRIES[record.enquiry_id] = updated
    return updated


def draft_enquiry_kb_entry(enquiry_id: str) -> AdhocEnquiryRecord | None:
    record = get_enquiry(enquiry_id)
    if record is None:
        return None
    if record.gap_state is None:
        raise EnquiryTransitionError("This enquiry does not have a gap for KB drafting.")
    if not record.gap_state.human_resolution:
        raise EnquiryTransitionError(
            "A verified CS resolution is required before drafting a KB entry."
        )
    if record.gap_state.status != "resolved_needs_kb_draft":
        raise EnquiryTransitionError("Only a resolved CS gap can be drafted into a KB entry.")

    kb_draft = KBDraftOutput(
        gap_theme=record.gap_state.gap_theme,
        faq_section=_suggest_faq_section(record.gap_state.gap_theme),
        question=_suggest_kb_question(record),
        answer=record.gap_state.human_resolution,
        source_ticket_ids=[record.enquiry_id],
        confidence=0.86,
        reviewer_notes=(
            record.gap_state.reviewer_note
            or "Generated from a verified CS resolution; review before publishing."
        ),
    )
    gap_state = record.gap_state.model_copy(
        update={"status": "kb_draft_ready", "kb_draft": kb_draft}
    )
    updated = record.model_copy(
        update={
            "state": "kb_draft_ready",
            "updated_at": _now_iso(),
            "gap_state": gap_state,
        }
    )
    _ENQUIRIES[record.enquiry_id] = updated
    return updated


def review_enquiry_kb_entry(
    enquiry_id: str,
    request: EnquiryKBReviewRequest,
) -> AdhocEnquiryRecord | None:
    record = get_enquiry(enquiry_id)
    if record is None:
        return None
    if record.gap_state is None or record.gap_state.kb_draft is None:
        raise EnquiryTransitionError("A drafted KB entry is required before review.")

    status = request.status
    gap_state = record.gap_state.model_copy(
        update={
            "status": status,
            "kb_review_note": request.reviewer_note,
            "kb_reviewed_at": _now_iso(),
        }
    )
    updated = record.model_copy(
        update={
            "state": "kb_approved" if status == "approved" else "kb_rejected",
            "updated_at": _now_iso(),
            "gap_state": gap_state,
        }
    )
    _ENQUIRIES[record.enquiry_id] = updated
    return updated


def list_prioritized_sample_tickets() -> list[TicketRecord]:
    tickets = get_dataset_snapshot().tickets
    scored = sorted(
        tickets,
        key=lambda ticket: (_sample_priority(ticket), ticket.ticket_id),
    )
    return scored[:10]


def live_persona_counts() -> dict[RequiredPersona, int]:
    return dict(Counter(record.classification.persona for record in _ENQUIRIES.values()))


def _build_synthetic_ticket(
    enquiry_id: str,
    request: AdhocEnquiryRequest,
    message: str,
    sample_ticket: TicketRecord | None,
) -> TicketRecord:
    if sample_ticket:
        return TicketRecord(
            ticket_id=enquiry_id,
            date_received=_today_iso(),
            customer_name=sample_ticket.customer_name,
            customer_email=sample_ticket.customer_email,
            order_id=sample_ticket.order_id,
            channel=f"demo_sample:{sample_ticket.channel}",
            question_type=sample_ticket.question_type,
            subject=sample_ticket.subject,
            message_body=sample_ticket.message_body,
            status="new_demo",
            answered_by_kb=sample_ticket.answered_by_kb,
            requires_escalation=sample_ticket.requires_escalation,
            buyer_persona=sample_ticket.buyer_persona,
            agent_notes=sample_ticket.agent_notes,
        )

    return TicketRecord(
        ticket_id=enquiry_id,
        date_received=_today_iso(),
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        order_id=None,
        channel=request.source,
        question_type=_infer_question_type(message),
        subject=_subject_from_message(message),
        message_body=message,
        status="new_demo",
        answered_by_kb=False,
        requires_escalation=False,
        buyer_persona="prospect",
        agent_notes=None,
    )


def _force_human_review(draft):
    draft_reply = draft.draft.model_copy(update={"approval_status": "needs_review"})
    return draft.model_copy(
        update={
            "draft": draft_reply,
            "approval": DraftApproval(status="needs_review"),
        }
    )


def _build_gap_state(classification, retrieval, draft) -> AdhocGapState:
    gap = draft.gap_record
    if gap is not None:
        theme = gap.gap_theme
        owner = gap.owner
        priority = gap.priority
        missing = gap.evidence_summary
        next_action = gap.suggested_next_action
    else:
        theme = classification.answerability.replace("_", " ")
        owner = "Customer Support"
        priority = "medium"
        missing = retrieval.insufficiency_reason or classification.routing_reason
        next_action = classification.routing_reason

    theme_text = theme.lower()
    marketing_signal = (
        classification.persona == "Sustainability Advocate"
        or "sustainability_signal" in classification.operational_tags
    )
    product_page_update_needed = any(
        term in theme_text
        for term in [
            "bpa",
            "carbon",
            "material",
            "recycling",
            "strap",
            "sustainability",
            "vegan",
        ]
    ) or marketing_signal

    return AdhocGapState(
        status="needs_resolution",
        gap_theme=theme,
        missing_knowledge=missing,
        owner=owner,
        priority=priority,
        suggested_next_action=next_action,
        product_page_update_needed=product_page_update_needed,
        marketing_signal=marketing_signal,
    )


def _build_trace(classification, retrieval, draft, source_refs: list[str], answerable: bool) -> list[TraceEvent]:
    evidence_ids = [evidence.evidence_id for evidence in retrieval.evidence[:5]]
    unsupported = ", ".join(retrieval.unsupported_terms)
    evidence_detail = (
        f"{len(retrieval.evidence)} sources retrieved; strongest source is {source_refs[0]}."
        if source_refs
        else "No local source produced strong evidence."
    )
    answerability_detail = (
        "Evidence is sufficient for a customer draft, but human approval is still required."
        if answerable
        else draft.decision.reasons[-1]
    )
    if unsupported:
        answerability_detail = f"{answerability_detail} Unsupported theme: {unsupported}."

    events = [
        TraceEvent(
            step="reading_enquiry",
            status="completed",
            title="Reading enquiry",
            detail="Parsed the customer wording and prepared a synthetic ticket for the demo session.",
        ),
        TraceEvent(
            step="classifying_buyer_persona",
            status="completed",
            title="Classifying buyer persona",
            detail=(
                f"Persona: {classification.persona}. Intent: {classification.intent}. "
                f"Reasoning: {classification.persona_reasoning}"
            ),
        ),
        TraceEvent(
            step="searching_knowledge_base",
            status="completed",
            title="Searching BOLDR knowledge base",
            detail=evidence_detail,
            source_refs=source_refs,
            evidence_ids=evidence_ids,
        ),
        TraceEvent(
            step="reviewing_evidence",
            status="completed",
            title="Reviewing evidence",
            detail=retrieval.insufficiency_reason
            or "Retrieved evidence passed the local sufficiency check.",
            source_refs=source_refs,
            evidence_ids=evidence_ids,
        ),
        TraceEvent(
            step="checking_answerability",
            status="completed" if answerable else "blocked",
            title="Checking answerability",
            detail=answerability_detail,
            evidence_ids=evidence_ids,
        ),
        TraceEvent(
            step="drafting_reply" if answerable else "routing_to_cs",
            status="completed",
            title="Drafting reply" if answerable else "Routing to CS",
            detail=(
                "Draft prepared. Awaiting BOLDR team approval."
                if answerable
                else "This needs team confirmation. A CS ticket has been created."
            ),
            source_refs=source_refs,
            evidence_ids=evidence_ids,
        ),
    ]
    if draft.failure_modes:
        events.append(
            TraceEvent(
                step="responsible_ai_check",
                status="blocked" if draft.safety_decision and draft.safety_decision.downgrade_applied else "completed",
                title="Responsible AI checks",
                detail=(
                    "Detected risk modes: "
                    + ", ".join(mode.replace("_", " ") for mode in draft.failure_modes)
                ),
                evidence_ids=evidence_ids,
            )
        )
    return events


def _infer_question_type(message: str) -> str:
    text = message.lower()
    if re.search(r"\bbld-\d+\b|tracking|refund|cancel|delivery|order", text):
        return "order_status"
    if any(term in text for term in ["engraving", "engrave", "caseback", "gift"]):
        return "engraving"
    if any(term in text for term in ["service", "servicing", "battery", "regulation", "polish"]):
        return "servicing"
    if any(
        term in text
        for term in [
            "carbon",
            "vegan",
            "recycling",
            "take-back",
            "mri",
            "shock resistance",
            "resale",
            "altitude",
        ]
    ):
        return "knowledge_gap"
    if any(term in text for term in ["bpa", "nickel", "hypoallergenic", "skin", "safe"]):
        return "materials_safety"
    if any(term in text for term in ["strap", "lug", "nato", "quick-release", "fkm"]):
        return "strap_compatibility"
    return "product_general"


def _subject_from_message(message: str) -> str:
    compact = " ".join(message.split())
    if len(compact) <= 74:
        return compact
    return f"{compact[:71].rstrip()}..."


def _find_sample_ticket(ticket_id: str | None) -> TicketRecord | None:
    if not ticket_id:
        return None
    normalized = ticket_id.upper()
    return next(
        (
            ticket
            for ticket in get_dataset_snapshot().tickets
            if ticket.ticket_id.upper() == normalized
        ),
        None,
    )


def _sample_priority(ticket: TicketRecord) -> tuple[int, int]:
    text = f"{ticket.subject} {ticket.message_body} {ticket.question_type}".lower()
    for index, pattern in enumerate(SAMPLE_PRIORITY_PATTERNS):
        if pattern.search(text):
            return (index, 0)
    return (len(SAMPLE_PRIORITY_PATTERNS), 1)


def _source_refs(evidence_cards) -> list[str]:
    refs: list[str] = []
    for evidence in evidence_cards:
        if evidence.source_type == "rate_card":
            label = f"Rate Card: {evidence.source_file}"
        elif evidence.source_type == "product_reference":
            label = f"Product Reference: {evidence.section_title}"
        elif evidence.source_type == "faq":
            label = f"Knowledge Base: FAQ / {evidence.section_title}"
        else:
            label = f"{evidence.source_type.replace('_', ' ').title()}: {evidence.section_title}"
        if label not in refs:
            refs.append(label)
    return refs


def _suggest_faq_section(gap_theme: str) -> str:
    theme = gap_theme.lower()
    if any(term in theme for term in ["carbon", "recycling", "vegan", "sustainability"]):
        return "Sustainability and Materials"
    if any(term in theme for term in ["mri", "magnetic", "allergy", "nickel", "bpa"]):
        return "Materials and Safety"
    if any(term in theme for term in ["engraving", "gift", "personalisation"]):
        return "Engraving and Gifting"
    if "strap" in theme:
        return "Straps and Compatibility"
    return "Product Information"


def _suggest_kb_question(record: AdhocEnquiryRecord) -> str:
    question = record.ticket.message_body.strip()
    question_lines = [line.strip() for line in question.splitlines() if line.strip()]
    candidate = next((line for line in reversed(question_lines) if "?" in line), question)
    if "?" in candidate:
        return candidate[: candidate.rfind("?") + 1]
    return f"What should customers know about {record.gap_state.gap_theme if record.gap_state else 'this topic'}?"


def _normalize_sentence(value: str) -> str:
    normalized = " ".join(value.split())
    if normalized.endswith((".", "!", "?")):
        return normalized
    return f"{normalized}."


def _today_iso() -> str:
    return datetime.now(UTC).date().isoformat()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
