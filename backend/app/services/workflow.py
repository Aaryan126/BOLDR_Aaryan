from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.ai import KBDraftOutput
from app.models.classification import AnswerabilityState, RequiredPersona
from app.models.dataset import TicketRecord
from app.models.drafting import ApprovalStatus, TicketDraft
from app.models.workflow import (
    BatchProcessRequest,
    GapMetrics,
    GapThemeMetric,
    GapListMeta,
    GapResolutionRequest,
    GapStatus,
    KnowledgeGapRecord,
    KBDraftReviewRequest,
    TicketListMeta,
    TicketWorkflowDetail,
    TicketWorkflowSummary,
    WorkflowOverview,
    WorkflowRunSummary,
    WorkflowRunType,
)
from app.services.classifications import get_ticket_classification, list_ticket_classifications
from app.services.datasets import get_dataset_snapshot
from app.services.drafts import get_ticket_draft, list_ticket_drafts
from app.services.retrieval import search_ticket_evidence

STABLE_WORKFLOW_ENDPOINTS = [
    "GET /api/workflow/overview",
    "GET /api/tickets",
    "GET /api/tickets/{ticket_id}",
    "GET /api/tickets/{ticket_id}/intelligence",
    "POST /api/tickets/{ticket_id}/process",
    "POST /api/tickets/process-batch",
    "GET /api/gaps",
    "GET /api/gaps/metrics",
    "GET /api/gaps/{gap_id}",
    "POST /api/gaps/{gap_id}/resolve",
    "POST /api/gaps/{gap_id}/draft-kb-entry",
    "POST /api/gaps/{gap_id}/review-kb-entry",
]

UNRESOLVED_GAP_STATUSES = {"new", "needs_human_answer", "awaiting_supplier"}


@dataclass
class GapState:
    status: GapStatus
    human_resolution: str | None = None
    owner: str | None = None
    reviewer_note: str | None = None
    kb_draft: KBDraftOutput | None = None
    kb_review_note: str | None = None
    kb_reviewed_at: str | None = None
    updated_at: str | None = None


_PROCESS_RUNS: list[WorkflowRunSummary] = []
_GAP_STATES: dict[str, GapState] = {}


def get_workflow_overview(phase: str) -> WorkflowOverview:
    drafts = list_ticket_drafts()
    gaps = list_knowledge_gaps()
    status_counts = Counter(gap.status for gap in gaps)
    return WorkflowOverview(
        phase=phase,
        stable_endpoint_count=len(STABLE_WORKFLOW_ENDPOINTS),
        ticket_count=len(get_dataset_snapshot().tickets),
        draft_count=len(drafts),
        gap_count=len(gaps),
        process_run_count=len(_PROCESS_RUNS),
        approval_queue_count=sum(1 for draft in drafts if draft.approval.status == "needs_review"),
        unresolved_gap_count=sum(status_counts[status] for status in UNRESOLVED_GAP_STATUSES),
        kb_draft_ready_count=status_counts["kb_draft_ready"],
        approved_gap_count=status_counts["approved"],
        rejected_gap_count=status_counts["rejected"],
        supported_review_actions=[
            "process_one_ticket",
            "process_batch",
            "approve_edit_reject_draft",
            "resolve_gap",
            "draft_kb_entry",
            "review_kb_entry",
        ],
    )


def list_ticket_workflows(
    *,
    persona: RequiredPersona | None = None,
    answerability: AnswerabilityState | None = None,
    reply_type: str | None = None,
    approval_status: ApprovalStatus | None = None,
    search: str | None = None,
    limit: int | None = None,
) -> tuple[list[TicketWorkflowSummary], TicketListMeta]:
    summaries = [_build_ticket_summary(ticket) for ticket in get_dataset_snapshot().tickets]
    filters: dict[str, str] = {}

    if persona:
        filters["persona"] = persona
        summaries = [summary for summary in summaries if summary.persona == persona]
    if answerability:
        filters["answerability"] = answerability
        summaries = [
            summary for summary in summaries if summary.answerability == answerability
        ]
    if reply_type:
        filters["reply_type"] = reply_type
        summaries = [summary for summary in summaries if summary.reply_type == reply_type]
    if approval_status:
        filters["approval_status"] = approval_status
        summaries = [
            summary for summary in summaries if summary.approval_status == approval_status
        ]
    if search:
        normalized_search = search.lower().strip()
        filters["search"] = search
        summaries = [
            summary
            for summary in summaries
            if normalized_search in summary.ticket_id.lower()
            or normalized_search in summary.subject.lower()
            or normalized_search in summary.intent.lower()
        ]

    total_after_filters = len(summaries)
    if limit is not None:
        filters["limit"] = str(limit)
        summaries = summaries[:limit]

    meta = TicketListMeta(
        total=total_after_filters,
        returned=len(summaries),
        filters=filters,
        answerability_counts=dict(Counter(summary.answerability for summary in summaries)),
        reply_type_counts=dict(Counter(summary.reply_type for summary in summaries)),
        approval_status_counts=dict(
            Counter(summary.approval_status for summary in summaries)
        ),
    )
    return summaries, meta


def get_ticket_workflow_detail(ticket_id: str) -> TicketWorkflowDetail | None:
    ticket = _find_ticket(ticket_id)
    classification = get_ticket_classification(ticket_id)
    retrieval = search_ticket_evidence(ticket_id)
    draft = get_ticket_draft(ticket_id)
    if ticket is None or classification is None or retrieval is None or draft is None:
        return None
    return TicketWorkflowDetail(
        workflow=_build_ticket_summary(ticket),
        ticket=ticket,
        classification=classification,
        retrieval=retrieval,
        draft=draft,
    )


def process_ticket_workflow(ticket_id: str) -> tuple[TicketWorkflowDetail, WorkflowRunSummary] | None:
    detail = get_ticket_workflow_detail(ticket_id)
    if detail is None:
        return None
    run = _create_run("single_ticket", [detail.workflow], [])
    _PROCESS_RUNS.append(run)
    return detail, run


def process_ticket_batch(
    request: BatchProcessRequest | None = None,
) -> tuple[list[TicketWorkflowSummary], WorkflowRunSummary]:
    request = request or BatchProcessRequest()
    requested_ids = [ticket_id.upper() for ticket_id in request.ticket_ids or []]
    all_summaries = [_build_ticket_summary(ticket) for ticket in get_dataset_snapshot().tickets]

    missing_ticket_ids: list[str] = []
    if requested_ids:
        by_id = {summary.ticket_id.upper(): summary for summary in all_summaries}
        selected = []
        for ticket_id in requested_ids:
            summary = by_id.get(ticket_id)
            if summary is None:
                missing_ticket_ids.append(ticket_id)
            else:
                selected.append(summary)
    else:
        selected = all_summaries

    if request.limit is not None:
        selected = selected[: request.limit]

    run = _create_run("batch", selected, missing_ticket_ids)
    _PROCESS_RUNS.append(run)
    return selected, run


def list_knowledge_gaps(
    *,
    status: GapStatus | None = None,
    search: str | None = None,
) -> list[KnowledgeGapRecord]:
    gaps = _build_gap_records()
    if status:
        gaps = [gap for gap in gaps if gap.status == status]
    if search:
        normalized_search = search.lower().strip()
        gaps = [
            gap
            for gap in gaps
            if normalized_search in gap.gap_theme.lower()
            or any(normalized_search in question.lower() for question in gap.gap_questions)
        ]
    return gaps


def get_gap_list_meta(
    gaps: list[KnowledgeGapRecord],
    *,
    filters: dict[str, str],
) -> GapListMeta:
    return GapListMeta(
        total=len(gaps),
        returned=len(gaps),
        filters=filters,
        status_counts=dict(Counter(gap.status for gap in gaps)),
        priority_counts=dict(Counter(gap.priority for gap in gaps)),
    )


def get_gap_metrics() -> GapMetrics:
    gaps = list_knowledge_gaps()
    status_counts = Counter(gap.status for gap in gaps)
    persona_counts: Counter[str] = Counter()
    for gap in gaps:
        persona_counts.update(gap.persona_counts)

    top_themes = [
        GapThemeMetric(
            gap_id=gap.gap_id,
            gap_theme=gap.gap_theme,
            frequency=gap.frequency,
            priority=gap.priority,
            status=gap.status,
            marketing_signal=gap.marketing_signal,
            product_page_update_needed=gap.product_page_update_needed,
        )
        for gap in sorted(gaps, key=lambda item: (-item.frequency, item.gap_theme))[:5]
    ]

    return GapMetrics(
        total_gaps=len(gaps),
        unresolved_gap_count=sum(status_counts[status] for status in UNRESOLVED_GAP_STATUSES),
        kb_draft_ready_count=status_counts["kb_draft_ready"],
        approved_count=status_counts["approved"],
        rejected_count=status_counts["rejected"],
        product_page_update_needed_count=sum(
            1 for gap in gaps if gap.product_page_update_needed
        ),
        marketing_signal_count=sum(1 for gap in gaps if gap.marketing_signal),
        by_status=dict(status_counts),
        by_priority=dict(Counter(gap.priority for gap in gaps)),
        by_owner=dict(Counter(gap.owner for gap in gaps)),
        by_persona=dict(persona_counts),
        top_themes=top_themes,
    )


def get_knowledge_gap(gap_id: str) -> KnowledgeGapRecord | None:
    normalized_gap_id = gap_id.lower()
    return next(
        (gap for gap in _build_gap_records() if gap.gap_id.lower() == normalized_gap_id),
        None,
    )


def resolve_knowledge_gap(
    gap_id: str,
    request: GapResolutionRequest,
) -> KnowledgeGapRecord | None:
    gap = get_knowledge_gap(gap_id)
    if gap is None:
        return None
    _GAP_STATES[gap.gap_id] = GapState(
        status=request.status,
        human_resolution=request.human_resolution,
        owner=request.owner,
        reviewer_note=request.reviewer_note,
        updated_at=_now_iso(),
    )
    return get_knowledge_gap(gap.gap_id)


def draft_kb_entry_for_gap(gap_id: str) -> KnowledgeGapRecord | None:
    gap = get_knowledge_gap(gap_id)
    if gap is None:
        return None

    state = _GAP_STATES.get(gap.gap_id)
    if state is None or not state.human_resolution:
        return gap

    kb_draft = KBDraftOutput(
        gap_theme=gap.gap_theme,
        faq_section=_suggest_faq_section(gap.gap_theme),
        question=_suggest_faq_question(gap),
        answer=_normalize_answer(state.human_resolution),
        source_ticket_ids=gap.source_ticket_ids,
        confidence=0.84,
        reviewer_notes=state.reviewer_note
        or "Generated from human-provided resolution; requires CS lead approval before publishing.",
    )
    _GAP_STATES[gap.gap_id] = GapState(
        status="kb_draft_ready",
        human_resolution=state.human_resolution,
        owner=state.owner,
        reviewer_note=state.reviewer_note,
        kb_draft=kb_draft,
        updated_at=_now_iso(),
    )
    return get_knowledge_gap(gap.gap_id)


def review_kb_entry_for_gap(
    gap_id: str,
    request: KBDraftReviewRequest,
) -> KnowledgeGapRecord | None:
    gap = get_knowledge_gap(gap_id)
    if gap is None:
        return None

    state = _GAP_STATES.get(gap.gap_id)
    if state is None or state.kb_draft is None:
        return gap

    reviewed_at = _now_iso()
    _GAP_STATES[gap.gap_id] = GapState(
        status=request.status,
        human_resolution=state.human_resolution,
        owner=state.owner,
        reviewer_note=state.reviewer_note,
        kb_draft=state.kb_draft,
        kb_review_note=request.reviewer_note,
        kb_reviewed_at=reviewed_at,
        updated_at=reviewed_at,
    )
    return get_knowledge_gap(gap.gap_id)


def gap_has_resolution(gap_id: str) -> bool:
    state = _GAP_STATES.get(gap_id.lower())
    return bool(state and state.human_resolution)


def gap_has_kb_draft(gap_id: str) -> bool:
    state = _GAP_STATES.get(gap_id.lower())
    return bool(state and state.kb_draft)


def _build_ticket_summary(ticket: TicketRecord) -> TicketWorkflowSummary:
    classification = get_ticket_classification(ticket.ticket_id)
    draft = get_ticket_draft(ticket.ticket_id)
    if classification is None or draft is None:
        raise ValueError(f"Missing generated workflow data for ticket {ticket.ticket_id}")
    return TicketWorkflowSummary(
        ticket_id=ticket.ticket_id,
        date_received=ticket.date_received,
        subject=ticket.subject,
        channel=ticket.channel,
        status=ticket.status,
        persona=classification.persona,
        intent=classification.intent,
        answerability=classification.answerability,
        reply_type=draft.decision.reply_type,
        approval_status=draft.approval.status,
        requires_escalation=classification.requires_escalation,
        evidence_count=len(draft.evidence_trace),
        guardrail_failures=sum(1 for guardrail in draft.guardrails if not guardrail.passed),
        gap_id=_slugify(draft.gap_record.gap_theme) if draft.gap_record else None,
    )


def _create_run(
    run_type: WorkflowRunType,
    summaries: list[TicketWorkflowSummary],
    missing_ticket_ids: list[str],
) -> WorkflowRunSummary:
    reply_counts = Counter(summary.reply_type for summary in summaries)
    return WorkflowRunSummary(
        run_id=f"run-{len(_PROCESS_RUNS) + 1:04d}",
        run_type=run_type,
        created_at=_now_iso(),
        processed_ticket_count=len(summaries),
        ticket_ids=[summary.ticket_id for summary in summaries],
        missing_ticket_ids=missing_ticket_ids,
        customer_reply_count=reply_counts["customer_reply"],
        holding_reply_count=reply_counts["holding_reply"],
        internal_note_count=reply_counts["internal_note"],
        gap_count=sum(1 for summary in summaries if summary.gap_id),
        guardrail_failures_count=sum(summary.guardrail_failures for summary in summaries),
    )


def _build_gap_records() -> list[KnowledgeGapRecord]:
    grouped: dict[str, list[TicketDraft]] = defaultdict(list)
    for draft in list_ticket_drafts():
        if draft.gap_record is not None:
            grouped[_slugify(draft.gap_record.gap_theme)].append(draft)

    records: list[KnowledgeGapRecord] = []
    for gap_id, drafts in grouped.items():
        first_gap = drafts[0].gap_record
        if first_gap is None:
            continue
        state = _GAP_STATES.get(gap_id)
        status: GapStatus = state.status if state else "new"
        owner = state.owner if state and state.owner else first_gap.owner
        marketing_signal = any(
            draft.persona == "Sustainability Advocate" for draft in drafts
        )
        suggested_faq_section = _suggest_faq_section(first_gap.gap_theme)
        records.append(
            KnowledgeGapRecord(
                gap_id=gap_id,
                gap_theme=first_gap.gap_theme,
                status=status,
                source_ticket_ids=[draft.ticket_id for draft in drafts],
                frequency=len(drafts),
                persona_counts=dict(Counter(draft.persona for draft in drafts)),
                owner=owner,
                priority=first_gap.priority,
                gap_questions=[draft.gap_record.gap_question for draft in drafts if draft.gap_record],
                evidence_summary=first_gap.evidence_summary,
                suggested_next_action=first_gap.suggested_next_action,
                suggested_faq_section=suggested_faq_section,
                product_page_update_needed=_needs_product_page_update(
                    first_gap.gap_theme,
                    suggested_faq_section,
                    marketing_signal,
                ),
                marketing_signal=marketing_signal,
                human_resolution=state.human_resolution if state else None,
                reviewer_note=state.reviewer_note if state else None,
                kb_draft=state.kb_draft if state else None,
                kb_review_note=state.kb_review_note if state else None,
                kb_reviewed_at=state.kb_reviewed_at if state else None,
                updated_at=state.updated_at if state else None,
            )
        )
    return sorted(records, key=lambda gap: (-gap.frequency, gap.gap_theme))


def _find_ticket(ticket_id: str) -> TicketRecord | None:
    normalized_ticket_id = ticket_id.upper()
    return next(
        (
            ticket
            for ticket in get_dataset_snapshot().tickets
            if ticket.ticket_id.upper() == normalized_ticket_id
        ),
        None,
    )


def _suggest_faq_section(gap_theme: str) -> str:
    theme = gap_theme.lower()
    if any(term in theme for term in ["carbon", "recycling", "vegan", "sustainability"]):
        return "Sustainability and Materials"
    if any(term in theme for term in ["mri", "magnetic", "allergy", "nickel"]):
        return "Materials and Safety"
    if any(term in theme for term in ["engraving", "gift", "personalisation"]):
        return "Engraving and Gifting"
    return "Product Information"


def _needs_product_page_update(
    gap_theme: str,
    suggested_faq_section: str,
    marketing_signal: bool,
) -> bool:
    theme = gap_theme.lower()
    product_page_terms = [
        "allergy",
        "bpa",
        "carbon",
        "magnetic",
        "material",
        "mri",
        "nickel",
        "packaging",
        "recycling",
        "strap",
        "sustainability",
        "vegan",
    ]
    return (
        marketing_signal
        or suggested_faq_section in {"Materials and Safety", "Sustainability and Materials"}
        or any(term in theme for term in product_page_terms)
    )


def _suggest_faq_question(gap: KnowledgeGapRecord) -> str:
    if gap.gap_questions:
        lines = [line.strip() for line in gap.gap_questions[0].splitlines() if line.strip()]
        question = next((line for line in reversed(lines) if "?" in line), lines[-1])
        if "?" in question:
            return question[: question.rfind("?") + 1]
        return f"{question.rstrip('.!')}?"
    return f"What should customers know about {gap.gap_theme}?"


def _normalize_answer(answer: str) -> str:
    normalized = " ".join(answer.split())
    if normalized.endswith((".", "!", "?")):
        return normalized
    return f"{normalized}."


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return f"gap-{slug or 'unknown'}"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
