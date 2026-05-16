from __future__ import annotations

import json
import re
from collections.abc import Mapping
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from app.models.ai import (
    AISchemaSummary,
    ChatMessage,
    DraftReplyOutput,
    EvidenceSufficiencyOutput,
    GapRecordOutput,
    IntentRefinementOutput,
    KBDraftOutput,
    MarketingBriefOutput,
    PersonaReasoningOutput,
    StructuredPromptPreview,
    ThemeClusterOutput,
)
from app.models.classification import TicketClassification
from app.models.drafting import AnswerabilityDecision
from app.models.retrieval import RetrievalResult

PROMPT_VERSION = "phase5_glm_structured_v1"

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
ORDER_ID_PATTERN = re.compile(r"\bBLD-\d+\b", re.IGNORECASE)
TRACKING_PATTERN = re.compile(r"\b(?:DHL|UPS|FEDEX|EMS|SGP?)[A-Z0-9]*\d{6,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?\d[\d -]{7,}\d)(?!\d)")

SchemaModel = TypeVar("SchemaModel", bound=BaseModel)

SCHEMA_REGISTRY: dict[str, tuple[type[BaseModel], str]] = {
    "intent_refinement": (
        IntentRefinementOutput,
        "Refine deterministic intent and routing without changing the five required personas.",
    ),
    "persona_reasoning": (
        PersonaReasoningOutput,
        "Explain buyer persona assignment using the exact challenge persona set.",
    ),
    "evidence_sufficiency": (
        EvidenceSufficiencyOutput,
        "Judge whether retrieved evidence can safely support a customer-facing answer.",
    ),
    "draft_reply": (
        DraftReplyOutput,
        "Create a grounded reply, holding reply, or internal note after evidence checks.",
    ),
    "gap_record": (
        GapRecordOutput,
        "Create a knowledge gap record for human resolution.",
    ),
    "kb_draft": (
        KBDraftOutput,
        "Draft a FAQ-style knowledge-base entry after a human answer is supplied.",
    ),
    "theme_cluster": (
        ThemeClusterOutput,
        "Summarize recurring customer themes with persona and action signals.",
    ),
    "marketing_brief": (
        MarketingBriefOutput,
        "Generate a source-backed marketing intelligence brief.",
    ),
}


class StructuredOutputError(ValueError):
    pass


def schema_catalog() -> list[AISchemaSummary]:
    return [
        AISchemaSummary(
            name=name,
            prompt_version=PROMPT_VERSION,
            description=description,
            json_schema=model.model_json_schema(),
        )
        for name, (model, description) in SCHEMA_REGISTRY.items()
    ]


def build_evidence_sufficiency_prompt(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> StructuredPromptPreview:
    schema = EvidenceSufficiencyOutput.model_json_schema()
    safe_payload = redact_value(
        {
            "ticket": {
                "ticket_id": classification.ticket_id,
                "question_text": classification.question_text,
                "intent": classification.intent,
                "persona": classification.persona,
                "answerability": classification.answerability,
                "operational_tags": classification.operational_tags,
                "routing_reason": classification.routing_reason,
            },
            "retrieval": {
                "sufficient_evidence": retrieval.sufficient_evidence,
                "unsupported_terms": retrieval.unsupported_terms,
                "insufficiency_reason": retrieval.insufficiency_reason,
                "evidence": [
                    {
                        "evidence_id": evidence.evidence_id,
                        "source_file": evidence.source_file,
                        "source_type": evidence.source_type,
                        "section_title": evidence.section_title,
                        "confidence": evidence.confidence,
                        "supports_answer": evidence.supports_answer,
                        "excerpt": evidence.excerpt,
                    }
                    for evidence in retrieval.evidence[:6]
                ],
                "conflict_warnings": [
                    warning.model_dump() for warning in retrieval.conflict_warnings
                ],
            },
        }
    )

    messages = [
        ChatMessage(
            role="system",
            content=(
                "You are an evidence sufficiency judge for BOLDR support. "
                "Return only valid JSON matching the provided schema. Do not add markdown. "
                "If evidence is weak, unsupported, order-specific, or requires a human decision, "
                "set sufficient_evidence=false."
            ),
        ),
        ChatMessage(
            role="user",
            content=json.dumps(
                {
                    "prompt_version": PROMPT_VERSION,
                    "schema_name": "evidence_sufficiency",
                    "schema": schema,
                    "input": safe_payload,
                },
                ensure_ascii=True,
                indent=2,
            ),
        ),
    ]

    return StructuredPromptPreview(
        prompt_version=PROMPT_VERSION,
        schema_name="evidence_sufficiency",
        ticket_id=classification.ticket_id,
        redacted=True,
        messages=messages,
    )


def build_draft_reply_prompt(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    decision: AnswerabilityDecision,
    sufficiency: EvidenceSufficiencyOutput,
) -> StructuredPromptPreview:
    schema = DraftReplyOutput.model_json_schema()
    safe_payload = redact_value(
        {
            "ticket": {
                "ticket_id": classification.ticket_id,
                "question_text": classification.question_text,
                "intent": classification.intent,
                "persona": classification.persona,
                "answerability": classification.answerability,
                "operational_tags": classification.operational_tags,
                "routing_reason": classification.routing_reason,
            },
            "decision": decision.model_dump(),
            "evidence_sufficiency": sufficiency.model_dump(),
            "retrieval": {
                "sufficient_evidence": retrieval.sufficient_evidence,
                "unsupported_terms": retrieval.unsupported_terms,
                "insufficiency_reason": retrieval.insufficiency_reason,
                "evidence": [
                    {
                        "evidence_id": evidence.evidence_id,
                        "source_file": evidence.source_file,
                        "source_type": evidence.source_type,
                        "section_title": evidence.section_title,
                        "confidence": evidence.confidence,
                        "supports_answer": evidence.supports_answer,
                        "excerpt": evidence.excerpt,
                        "structured_data": evidence.structured_data,
                    }
                    for evidence in retrieval.evidence[:6]
                    if evidence.supports_answer
                ],
                "conflict_warnings": [
                    warning.model_dump() for warning in retrieval.conflict_warnings
                ],
            },
        }
    )

    messages = [
        ChatMessage(
            role="system",
            content=(
                "You are a BOLDR customer support drafter. Return only valid JSON matching "
                "the provided schema. Draft only from the supplied evidence. Do not invent "
                "availability, policy, order status, certification, discounts, or technical "
                "claims. If the customer asks a price question about a named watch and "
                "multiple matching variants are in evidence, list each matching variant and "
                "its SGD price. Use concise, customer-ready wording."
            ),
        ),
        ChatMessage(
            role="user",
            content=json.dumps(
                {
                    "prompt_version": PROMPT_VERSION,
                    "schema_name": "draft_reply",
                    "schema": schema,
                    "input": safe_payload,
                    "rules": [
                        "reply_type must be customer_reply for supported customer answers.",
                        "evidence_ids must come from the supplied evidence list.",
                        "claims must be short factual claims supported by those evidence_ids.",
                        "Do not include raw table rows, pipe-delimited evidence, markdown tables, or citations.",
                    ],
                },
                ensure_ascii=True,
                indent=2,
            ),
        ),
    ]

    return StructuredPromptPreview(
        prompt_version=PROMPT_VERSION,
        schema_name="draft_reply",
        ticket_id=classification.ticket_id,
        redacted=True,
        messages=messages,
    )


def parse_structured_output(content: str, model: type[SchemaModel]) -> SchemaModel:
    raw_json = strip_json_fences(content)
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as error:
        raise StructuredOutputError(f"Model output was not valid JSON: {error}") from error

    try:
        return model.model_validate(payload)
    except ValidationError as error:
        raise StructuredOutputError(f"Model output failed schema validation: {error}") from error


def strip_json_fences(content: str) -> str:
    stripped = content.strip()
    if not stripped.startswith("```"):
        return stripped
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    return stripped.strip()


def redact_value(value: Any) -> Any:
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, list):
        return [redact_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_value(item) for item in value)
    if isinstance(value, Mapping):
        return {key: redact_value(item) for key, item in value.items()}
    return value


def redact_text(text: str) -> str:
    redacted = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    redacted = ORDER_ID_PATTERN.sub("[REDACTED_ORDER_ID]", redacted)
    redacted = TRACKING_PATTERN.sub("[REDACTED_TRACKING_ID]", redacted)
    redacted = PHONE_PATTERN.sub("[REDACTED_PHONE]", redacted)
    return redacted
