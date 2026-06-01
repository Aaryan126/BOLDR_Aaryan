from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.core.rate_limit import enforce_public_enquiry_rate_limit
from app.models.ai import AIProviderStatus, AISchemaSummary, StructuredPromptPreview
from app.models.ai import ReplyType
from app.models.classification import (
    AnswerabilityState,
    ClassificationEvaluation,
    RequiredPersona,
    TicketClassification,
)
from app.models.dataset import DatasetDiagnostics, DatasetSamples, SourceFile, TicketRecord
from app.models.drafting import ApprovalStatus, DraftEvaluation, DraftReviewRequest, TicketDraft
from app.models.enquiry import (
    AdhocEnquiryRecord,
    AdhocEnquiryRequest,
    EnquiryApprovalRequest,
    EnquiryGapResolutionRequest,
    EnquiryKBReviewRequest,
    EnquiryResetResponse,
)
from app.models.evaluation import QualityScorecardResponse, ReviewTrendResponse
from app.models.external import (
    ExternalBenchmarkResponse,
    ExternalMentionListResponse,
    ExternalSourceListResponse,
)
from app.models.insights import (
    MarketingBriefRequest,
    MarketingBriefResponse,
    ThemeRadarResponse,
)
from app.models.retrieval import RetrievalEvaluation, RetrievalResult
from app.models.workflow import (
    BatchProcessRequest,
    BatchProcessResponse,
    GapDetailResponse,
    GapKBDraftResponse,
    GapListResponse,
    GapMetricsResponse,
    GapResolutionRequest,
    GapStatus,
    KBDraftReviewRequest,
    TicketDetailResponse,
    TicketListResponse,
    TicketProcessRequest,
    TicketProcessResponse,
    WorkflowOverview,
)
from app.services.ai import get_ai_schema_catalog, get_ai_status, get_evidence_prompt_preview
from app.services.classifications import (
    get_classification_evaluation,
    get_ticket_classification,
    list_ticket_classifications,
)
from app.services.datasets import get_dataset_samples, get_dataset_snapshot
from app.services.drafts import (
    get_draft_evaluation,
    get_ticket_draft,
    list_ticket_drafts,
    review_ticket_draft,
)
from app.services.enquiries import (
    EnquiryTransitionError,
    create_enquiry,
    draft_enquiry_kb_entry,
    get_enquiry,
    list_enquiries,
    list_prioritized_sample_tickets,
    reset_enquiries,
    resolve_enquiry_gap,
    review_enquiry_answer,
    review_enquiry_kb_entry,
)
from app.services.evaluation import get_quality_scorecard, get_review_trends
from app.services.external import (
    generate_external_benchmarks,
    list_external_mentions,
    list_external_sources,
)
from app.services.insights import generate_marketing_brief, get_theme_radar
from app.services.retrieval import (
    get_retrieval_evaluation,
    search_knowledge,
    search_ticket_evidence,
)
from app.services.workflow import (
    draft_kb_entry_for_gap,
    gap_has_kb_draft,
    gap_has_resolution,
    get_gap_metrics,
    get_gap_list_meta,
    get_knowledge_gap,
    get_ticket_workflow_detail,
    get_workflow_overview,
    list_knowledge_gaps,
    list_ticket_workflows,
    process_ticket_batch,
    process_ticket_workflow,
    review_kb_entry_for_gap,
    resolve_knowledge_gap,
)

router = APIRouter()


@router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "phase": settings.app_phase,
    }


@router.get("/api/meta", tags=["system"])
def meta() -> dict[str, object]:
    settings = get_settings()
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "phase": settings.app_phase,
        "environment": settings.app_env,
        "modules": [
            {
                "name": "Inbox Intelligence",
                "status": "workflow_api_ready",
                "description": "Batch ticket triage and intelligence pass entry point.",
            },
            {
                "name": "Ticket Review",
                "status": "workflow_api_ready",
                "description": "Single-ticket evidence and source trace workspace.",
            },
            {
                "name": "Knowledge Gaps",
                "status": "kb_loop_ready",
                "description": "Gap queue, resolution workflow, FAQ drafting, and KB review gates.",
            },
            {
                "name": "Theme Radar",
                "status": "insights_ready",
                "description": "Weekly clustering and emerging signal view.",
            },
            {
                "name": "Marketing Brief",
                "status": "insights_ready",
                "description": "Monthly product and marketing intelligence output.",
            },
            {
                "name": "Quality Dashboard",
                "status": "evaluation_ready",
                "description": "Accuracy, guardrail, evidence, and regression scorecard.",
            },
            {
                "name": "External Benchmarking",
                "status": "benchmark_ready",
                "description": "Bonus market sentiment comparison layer.",
            },
        ],
    }


@router.get("/api/datasets/diagnostics", tags=["datasets"])
def dataset_diagnostics() -> DatasetDiagnostics:
    return get_dataset_snapshot().diagnostics


@router.get("/api/datasets/sources", tags=["datasets"])
def dataset_sources() -> list[SourceFile]:
    return get_dataset_snapshot().sources


@router.get("/api/datasets/samples", tags=["datasets"])
def dataset_record_samples() -> DatasetSamples:
    return get_dataset_samples()


@router.get("/api/intelligence/classifications", tags=["intelligence"])
def ticket_classifications() -> list[TicketClassification]:
    return list_ticket_classifications()


@router.get("/api/intelligence/classifications/{ticket_id}", tags=["intelligence"])
def ticket_classification(ticket_id: str) -> TicketClassification:
    classification = get_ticket_classification(ticket_id)
    if classification is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return classification


@router.get("/api/intelligence/evaluation", tags=["intelligence"])
def classification_evaluation() -> ClassificationEvaluation:
    return get_classification_evaluation()


@router.get("/api/retrieval/search", tags=["retrieval"])
def retrieval_search(
    query: str = Query(..., min_length=2),
    limit: int = Query(default=8, ge=1, le=20),
) -> RetrievalResult:
    return search_knowledge(query=query, limit=limit)


@router.get("/api/retrieval/tickets/{ticket_id}", tags=["retrieval"])
def ticket_evidence(ticket_id: str) -> RetrievalResult:
    result = search_ticket_evidence(ticket_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return result


@router.get("/api/retrieval/evaluation", tags=["retrieval"])
def retrieval_evaluation() -> RetrievalEvaluation:
    return get_retrieval_evaluation()


@router.get("/api/ai/status", tags=["ai"])
def ai_status() -> AIProviderStatus:
    return get_ai_status()


@router.get("/api/ai/schemas", tags=["ai"])
def ai_schemas() -> list[AISchemaSummary]:
    return get_ai_schema_catalog()


@router.get("/api/ai/prompt-preview/{ticket_id}", tags=["ai"])
def ai_prompt_preview(ticket_id: str) -> StructuredPromptPreview:
    preview = get_evidence_prompt_preview(ticket_id)
    if preview is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return preview


@router.get("/api/drafts", tags=["drafts"])
def ticket_drafts() -> list[TicketDraft]:
    return list_ticket_drafts()


@router.post(
    "/api/enquiries",
    tags=["enquiries"],
    dependencies=[Depends(enforce_public_enquiry_rate_limit)],
)
def adhoc_enquiry_create(request: AdhocEnquiryRequest) -> AdhocEnquiryRecord:
    try:
        return create_enquiry(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/enquiries", tags=["enquiries"])
def adhoc_enquiry_list() -> list[AdhocEnquiryRecord]:
    return list_enquiries()


@router.get("/api/enquiries/samples", tags=["enquiries"])
def adhoc_enquiry_samples() -> list[TicketRecord]:
    return list_prioritized_sample_tickets()


@router.post("/api/enquiries/reset", tags=["enquiries"])
def adhoc_enquiry_reset() -> EnquiryResetResponse:
    return reset_enquiries()


@router.get("/api/enquiries/{enquiry_id}", tags=["enquiries"])
def adhoc_enquiry_detail(enquiry_id: str) -> AdhocEnquiryRecord:
    record = get_enquiry(enquiry_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Enquiry not found: {enquiry_id}")
    return record


@router.post("/api/enquiries/{enquiry_id}/approve", tags=["enquiries"])
def adhoc_enquiry_approve(
    enquiry_id: str,
    request: EnquiryApprovalRequest,
) -> AdhocEnquiryRecord:
    try:
        record = review_enquiry_answer(enquiry_id, request)
    except EnquiryTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail=f"Enquiry not found: {enquiry_id}")
    return record


@router.post("/api/enquiries/{enquiry_id}/resolve-gap", tags=["enquiries"])
def adhoc_enquiry_resolve_gap(
    enquiry_id: str,
    request: EnquiryGapResolutionRequest,
) -> AdhocEnquiryRecord:
    try:
        record = resolve_enquiry_gap(enquiry_id, request)
    except EnquiryTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail=f"Enquiry not found: {enquiry_id}")
    return record


@router.post("/api/enquiries/{enquiry_id}/draft-kb", tags=["enquiries"])
def adhoc_enquiry_draft_kb(enquiry_id: str) -> AdhocEnquiryRecord:
    try:
        record = draft_enquiry_kb_entry(enquiry_id)
    except EnquiryTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail=f"Enquiry not found: {enquiry_id}")
    return record


@router.post("/api/enquiries/{enquiry_id}/review-kb", tags=["enquiries"])
def adhoc_enquiry_review_kb(
    enquiry_id: str,
    request: EnquiryKBReviewRequest,
) -> AdhocEnquiryRecord:
    try:
        record = review_enquiry_kb_entry(enquiry_id, request)
    except EnquiryTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail=f"Enquiry not found: {enquiry_id}")
    return record


@router.get("/api/drafts/evaluation", tags=["drafts"])
def draft_evaluation() -> DraftEvaluation:
    return get_draft_evaluation()


@router.get("/api/drafts/tickets/{ticket_id}", tags=["drafts"])
def ticket_draft(ticket_id: str) -> TicketDraft:
    draft = get_ticket_draft(ticket_id)
    if draft is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return draft


@router.post("/api/drafts/tickets/{ticket_id}/review", tags=["drafts"])
def draft_review(ticket_id: str, review: DraftReviewRequest) -> TicketDraft:
    draft = review_ticket_draft(ticket_id, review)
    if draft is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return draft


@router.get("/api/themes/radar", tags=["insights"])
def theme_radar() -> ThemeRadarResponse:
    data, meta = get_theme_radar()
    return ThemeRadarResponse(data=data, meta=meta)


@router.get("/api/marketing-briefs/current", tags=["insights"])
def current_marketing_brief() -> MarketingBriefResponse:
    return MarketingBriefResponse(data=generate_marketing_brief())


@router.post("/api/marketing-briefs/generate", tags=["insights"])
def marketing_brief_generate(
    request: MarketingBriefRequest | None = None,
) -> MarketingBriefResponse:
    return MarketingBriefResponse(data=generate_marketing_brief(request))


@router.get("/api/evaluation/scorecard", tags=["evaluation"])
def evaluation_scorecard() -> QualityScorecardResponse:
    return QualityScorecardResponse(data=get_quality_scorecard(get_settings().app_phase))


@router.get("/api/evaluation/review-trends", tags=["evaluation"])
def evaluation_review_trends() -> ReviewTrendResponse:
    return ReviewTrendResponse(data=get_review_trends())


@router.get("/api/external/sources", tags=["external"])
def external_sources() -> ExternalSourceListResponse:
    return ExternalSourceListResponse(data=list_external_sources())


@router.get("/api/external/mentions", tags=["external"])
def external_mentions() -> ExternalMentionListResponse:
    return ExternalMentionListResponse(data=list_external_mentions())


@router.get("/api/external/benchmarks", tags=["external"])
def external_benchmarks() -> ExternalBenchmarkResponse:
    return ExternalBenchmarkResponse(data=generate_external_benchmarks())


@router.post("/api/external/benchmarks/generate", tags=["external"])
def external_benchmarks_generate() -> ExternalBenchmarkResponse:
    return ExternalBenchmarkResponse(data=generate_external_benchmarks())


@router.get("/api/workflow/overview", tags=["workflow"])
def workflow_overview() -> WorkflowOverview:
    return get_workflow_overview(get_settings().app_phase)


@router.get("/api/tickets", tags=["workflow"])
def tickets(
    persona: RequiredPersona | None = None,
    answerability: AnswerabilityState | None = None,
    reply_type: ReplyType | None = None,
    approval_status: ApprovalStatus | None = None,
    search: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=70),
) -> TicketListResponse:
    summaries, meta = list_ticket_workflows(
        persona=persona,
        answerability=answerability,
        reply_type=reply_type,
        approval_status=approval_status,
        search=search,
        limit=limit,
    )
    return TicketListResponse(data=summaries, meta=meta)


@router.post("/api/tickets/process-batch", tags=["workflow"])
def tickets_process_batch(
    request: BatchProcessRequest | None = None,
) -> BatchProcessResponse:
    summaries, run = process_ticket_batch(request)
    return BatchProcessResponse(data=summaries, meta=run)


@router.get("/api/tickets/{ticket_id}", tags=["workflow"])
def ticket_detail(ticket_id: str) -> TicketDetailResponse:
    detail = get_ticket_workflow_detail(ticket_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    return TicketDetailResponse(data=detail)


@router.get("/api/tickets/{ticket_id}/intelligence", tags=["workflow"])
def ticket_intelligence(ticket_id: str) -> TicketDetailResponse:
    return ticket_detail(ticket_id)


@router.post("/api/tickets/{ticket_id}/process", tags=["workflow"])
def ticket_process(
    ticket_id: str,
    request: TicketProcessRequest | None = None,
) -> TicketProcessResponse:
    _ = request
    result = process_ticket_workflow(ticket_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Ticket not found: {ticket_id}")
    detail, run = result
    return TicketProcessResponse(data=detail, meta=run)


@router.get("/api/gaps", tags=["workflow"])
def gaps(
    status: GapStatus | None = None,
    search: str | None = None,
) -> GapListResponse:
    filters = {}
    if status:
        filters["status"] = status
    if search:
        filters["search"] = search
    records = list_knowledge_gaps(status=status, search=search)
    return GapListResponse(data=records, meta=get_gap_list_meta(records, filters=filters))


@router.get("/api/gaps/metrics", tags=["workflow"])
def gap_metrics() -> GapMetricsResponse:
    return GapMetricsResponse(data=get_gap_metrics())


@router.get("/api/gaps/{gap_id}", tags=["workflow"])
def gap_detail(gap_id: str) -> GapDetailResponse:
    gap = get_knowledge_gap(gap_id)
    if gap is None:
        raise HTTPException(status_code=404, detail=f"Gap not found: {gap_id}")
    return GapDetailResponse(data=gap)


@router.post("/api/gaps/{gap_id}/resolve", tags=["workflow"])
def gap_resolve(gap_id: str, request: GapResolutionRequest) -> GapDetailResponse:
    gap = resolve_knowledge_gap(gap_id, request)
    if gap is None:
        raise HTTPException(status_code=404, detail=f"Gap not found: {gap_id}")
    return GapDetailResponse(data=gap)


@router.post("/api/gaps/{gap_id}/draft-kb-entry", tags=["workflow"])
def gap_draft_kb_entry(gap_id: str) -> GapKBDraftResponse:
    normalized_gap_id = gap_id.lower()
    gap = draft_kb_entry_for_gap(normalized_gap_id)
    if gap is None:
        raise HTTPException(status_code=404, detail=f"Gap not found: {gap_id}")
    if not gap_has_resolution(normalized_gap_id):
        raise HTTPException(
            status_code=409,
            detail="Gap needs a human resolution before a KB entry can be drafted.",
        )
    return GapKBDraftResponse(data=gap)


@router.post("/api/gaps/{gap_id}/review-kb-entry", tags=["workflow"])
def gap_review_kb_entry(
    gap_id: str,
    request: KBDraftReviewRequest,
) -> GapDetailResponse:
    normalized_gap_id = gap_id.lower()
    gap = review_kb_entry_for_gap(normalized_gap_id, request)
    if gap is None:
        raise HTTPException(status_code=404, detail=f"Gap not found: {gap_id}")
    if not gap_has_kb_draft(normalized_gap_id):
        raise HTTPException(
            status_code=409,
            detail="Gap needs a drafted KB entry before it can be reviewed.",
        )
    return GapDetailResponse(data=gap)
