from functools import lru_cache

from app.core.config import get_settings
from app.intelligence.ai_provider import FPTGLMProvider
from app.intelligence.structured_outputs import (
    build_evidence_sufficiency_prompt,
    schema_catalog,
)
from app.models.ai import AIProviderStatus, AISchemaSummary, StructuredPromptPreview
from app.services.classifications import get_ticket_classification
from app.services.retrieval import search_ticket_evidence


def get_ai_status() -> AIProviderStatus:
    settings = get_settings()
    return AIProviderStatus(
        provider=settings.ai_provider,
        model=settings.glm_model,
        base_url=settings.fpt_ai_base_url,
        configured=bool(settings.fpt_ai_api_key),
        live_enabled=settings.ai_live_enabled,
        timeout_seconds=settings.ai_timeout_seconds,
        max_retries=settings.ai_max_retries,
        prompt_redaction_enabled=True,
        structured_schema_count=len(schema_catalog()),
    )


def get_ai_schema_catalog() -> list[AISchemaSummary]:
    return schema_catalog()


def get_evidence_prompt_preview(ticket_id: str) -> StructuredPromptPreview | None:
    classification = get_ticket_classification(ticket_id)
    retrieval = search_ticket_evidence(ticket_id)
    if classification is None or retrieval is None:
        return None
    return build_evidence_sufficiency_prompt(classification, retrieval)


@lru_cache
def get_fpt_glm_provider() -> FPTGLMProvider:
    settings = get_settings()
    return FPTGLMProvider(
        api_key=settings.fpt_ai_api_key,
        base_url=settings.fpt_ai_base_url,
        model=settings.glm_model,
        timeout_seconds=settings.ai_timeout_seconds,
        max_retries=settings.ai_max_retries,
        thinking_enabled=settings.glm_thinking_enabled,
    )
