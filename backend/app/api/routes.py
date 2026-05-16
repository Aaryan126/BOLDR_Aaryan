from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.classification import ClassificationEvaluation, TicketClassification
from app.models.dataset import DatasetDiagnostics, DatasetSamples, SourceFile
from app.services.classifications import (
    get_classification_evaluation,
    get_ticket_classification,
    list_ticket_classifications,
)
from app.services.datasets import get_dataset_samples, get_dataset_snapshot

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
                "status": "scaffolded",
                "description": "Batch ticket triage and intelligence pass entry point.",
            },
            {
                "name": "Ticket Review",
                "status": "scaffolded",
                "description": "Single-ticket evidence, draft, and approval workspace.",
            },
            {
                "name": "Knowledge Gaps",
                "status": "scaffolded",
                "description": "Gap queue and future FAQ drafting workflow.",
            },
            {
                "name": "Theme Radar",
                "status": "scaffolded",
                "description": "Weekly clustering and emerging signal view.",
            },
            {
                "name": "Marketing Brief",
                "status": "scaffolded",
                "description": "Monthly product and marketing intelligence output.",
            },
            {
                "name": "External Benchmarking",
                "status": "planned",
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
