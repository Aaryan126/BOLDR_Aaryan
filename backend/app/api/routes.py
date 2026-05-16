from fastapi import APIRouter

from app.core.config import get_settings

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
