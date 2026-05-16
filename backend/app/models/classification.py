from typing import Literal

from pydantic import BaseModel

RequiredPersona = Literal[
    "Health-Conscious Buyer",
    "Gifter",
    "Enthusiast / Collector",
    "Active / Outdoor Buyer",
    "Sustainability Advocate",
]

AnswerabilityState = Literal[
    "answerable",
    "partially_answerable",
    "knowledge_gap",
    "order_lookup_required",
    "needs_human_review",
]

OperationalTag = Literal[
    "order_lookup_required",
    "knowledge_gap",
    "pricing_question",
    "safety_question",
    "gift_or_personalisation",
    "outdoor_use",
    "sustainability_signal",
    "source_conflict_possible",
    "transactional_context",
    "corporate_or_bulk",
    "aftercare_or_servicing",
    "collector_or_specs",
]


class PersonaDecision(BaseModel):
    persona: RequiredPersona
    confidence: float
    trigger_terms: list[str]
    reasoning: str


class TicketClassification(BaseModel):
    ticket_id: str
    question_text: str
    normalized_question: str
    channel: str
    intent: str
    question_type_hints: list[str]
    persona: RequiredPersona
    persona_confidence: float
    persona_trigger_terms: list[str]
    persona_reasoning: str
    operational_tags: list[OperationalTag]
    answerability: AnswerabilityState
    requires_escalation: bool
    routing_reason: str
    extracted_order_ids: list[str]
    extracted_tracking_ids: list[str]
    csv_question_type: str
    csv_buyer_persona: str
    csv_answered_by_kb: bool
    csv_requires_escalation: bool


class ClassificationEvaluation(BaseModel):
    total_tickets: int
    classified_tickets: int
    required_persona_counts: dict[str, int]
    csv_persona_counts: dict[str, int]
    answerability_counts: dict[str, int]
    operational_tag_counts: dict[str, int]
    question_type_counts: dict[str, int]
    order_lookup_required_count: int
    knowledge_gap_count: int
    needs_human_review_count: int
    escalation_matches_csv: int
    escalation_accuracy: float
    answerability_matches_csv: int
    answerability_label_accuracy: float
    final_personas: list[str]
    exposes_transactional_persona: bool
    tricky_case_ticket_ids: list[str]
