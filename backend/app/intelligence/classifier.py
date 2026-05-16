from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable

from app.models.classification import (
    AnswerabilityState,
    ClassificationEvaluation,
    OperationalTag,
    PersonaDecision,
    RequiredPersona,
    TicketClassification,
)
from app.models.dataset import TicketRecord

REQUIRED_PERSONAS: list[RequiredPersona] = [
    "Health-Conscious Buyer",
    "Gifter",
    "Enthusiast / Collector",
    "Active / Outdoor Buyer",
    "Sustainability Advocate",
]

PERSONA_RULES: list[tuple[RequiredPersona, list[str], str]] = [
    (
        "Sustainability Advocate",
        [
            "vegan",
            "carbon",
            "carbon-neutral",
            "carbon neutral",
            "recycling",
            "take-back",
            "sustainability",
            "environmental",
            "eco",
            "packaging",
            "dispose",
        ],
        "Customer language points to sustainability, ethics, or environmental impact.",
    ),
    (
        "Health-Conscious Buyer",
        [
            "bpa",
            "nickel",
            "hypoallergenic",
            "skin",
            "sensitive",
            "safe for kids",
            "children",
            "child",
            "non-toxic",
            "dye",
            "food-grade",
            "medical-grade",
            "allergy",
            "reach",
            "rohs",
        ],
        "Customer is checking safety, allergens, skin sensitivity, or compliance claims.",
    ),
    (
        "Gifter",
        [
            "engraving",
            "engrave",
            "gift",
            "birthday",
            "wedding",
            "anniversary",
            "personalisation",
            "personalization",
            "father",
            "parents",
            "dedication",
            "turnaround",
            "rush",
        ],
        "Customer is buying for a gift or asking about personalisation.",
    ),
    (
        "Active / Outdoor Buyer",
        [
            "water",
            "swim",
            "swimming",
            "diving",
            "shock",
            "trail",
            "running",
            "rock climbing",
            "altitude",
            "trek",
            "fk m",
            "fkm",
            "rubber strap",
            "nato",
            "quick-release",
            "quick release",
            "strap compatibility",
            "lug width",
            "mesh bracelet",
        ],
        "Customer is asking about fit, straps, rugged use, water use, or outdoor scenarios.",
    ),
    (
        "Enthusiast / Collector",
        [
            "grade 5",
            "grade 2",
            "titanium",
            "miyota",
            "movement",
            "limited edition",
            "collector",
            "collaboration",
            "resale",
            "spec",
            "warranty",
            "expedition",
            "journey",
            "model",
            "price match",
            "return policy",
            "size recommendation",
        ],
        "Customer is evaluating specs, model choice, collectability, or ownership value.",
    ),
]

INTENT_KEYWORDS: dict[str, list[str]] = {
    "order_status": ["order", "tracking", "refund", "cancel", "address", "customs", "discount"],
    "engraving": ["engraving", "engrave", "caseback", "logo", "font", "characters"],
    "servicing": ["service", "battery", "regulation", "polish", "crystal", "warranty"],
    "materials_safety": ["bpa", "nickel", "hypoallergenic", "safe", "reach", "rohs", "titanium"],
    "strap_compatibility": ["strap", "lug", "nato", "mesh", "quick-release", "rubber"],
    "product_general": ["warranty", "return", "gift", "bulk", "expedition", "journey"],
    "knowledge_gap": ["carbon", "vegan", "recycling", "mri", "altitude", "resale", "shock"],
}

ORDER_ID_PATTERN = re.compile(r"\bBLD-\d+\b", re.IGNORECASE)
TRACKING_PATTERN = re.compile(r"\b(?:DHL|UPS|FEDEX|EMS|SGP?)[A-Z0-9]*\d{6,}\b", re.IGNORECASE)

KNOWLEDGE_GAP_TERMS = [
    "magnetic",
    "mri",
    "altitude",
    "5,000m",
    "5000m",
    "resale",
    "independent watchmakers",
    "collaborate",
    "shock resistance",
    "shock-rated",
    "trail running",
    "rock climbing",
    "strap recycling",
    "take-back",
    "vegan",
    "carbon-neutral",
    "carbon neutral",
    "carbon footprint",
]

HUMAN_REVIEW_TERMS = [
    "older model",
    "discontinued",
    "bulk",
    "wholesale",
    "corporate",
    "price match",
    "discount code",
    "chargeback",
]

PRICING_TERMS = ["price", "pricing", "cost", "fee", "surcharge", "discount", "wholesale", "bulk"]
CONFLICT_CONTEXT_TERMS = [
    "engraving",
    "service",
    "servicing",
    "battery",
    "regulation",
    "full service",
    "turnaround",
    "cost",
    "price",
]


def classify_tickets(tickets: list[TicketRecord]) -> list[TicketClassification]:
    return [classify_ticket(ticket) for ticket in tickets]


def classify_ticket(ticket: TicketRecord) -> TicketClassification:
    question_text = f"{ticket.subject}\n\n{ticket.message_body}".strip()
    normalized_question = normalize_question(question_text)
    order_ids = extract_order_ids(ticket, question_text)
    tracking_ids = extract_tracking_ids(question_text)
    question_type_hints = infer_question_type_hints(ticket.question_type, normalized_question)
    persona = decide_persona(ticket, normalized_question)
    operational_tags = infer_operational_tags(ticket, normalized_question, order_ids, tracking_ids)
    answerability = decide_answerability(ticket, normalized_question, operational_tags)
    requires_escalation = answerability != "answerable"
    routing_reason = explain_routing(answerability, operational_tags, normalized_question)

    return TicketClassification(
        ticket_id=ticket.ticket_id,
        question_text=question_text,
        normalized_question=normalized_question,
        channel=ticket.channel,
        intent=ticket.question_type,
        question_type_hints=question_type_hints,
        persona=persona.persona,
        persona_confidence=persona.confidence,
        persona_trigger_terms=persona.trigger_terms,
        persona_reasoning=persona.reasoning,
        operational_tags=operational_tags,
        answerability=answerability,
        requires_escalation=requires_escalation,
        routing_reason=routing_reason,
        extracted_order_ids=order_ids,
        extracted_tracking_ids=tracking_ids,
        csv_question_type=ticket.question_type,
        csv_buyer_persona=ticket.buyer_persona,
        csv_answered_by_kb=ticket.answered_by_kb,
        csv_requires_escalation=ticket.requires_escalation,
    )


def evaluate_classifications(classifications: list[TicketClassification]) -> ClassificationEvaluation:
    total = len(classifications)
    persona_counts = Counter(item.persona for item in classifications)
    csv_persona_counts = Counter(item.csv_buyer_persona for item in classifications)
    answerability_counts = Counter(item.answerability for item in classifications)
    tag_counts: Counter[str] = Counter()
    question_type_counts = Counter(item.intent for item in classifications)

    escalation_matches = 0
    answerability_matches = 0

    for classification in classifications:
        tag_counts.update(classification.operational_tags)
        if classification.requires_escalation == classification.csv_requires_escalation:
            escalation_matches += 1
        predicted_answered_by_kb = classification.answerability == "answerable"
        if predicted_answered_by_kb == classification.csv_answered_by_kb:
            answerability_matches += 1

    tricky_case_ids = [
        classification.ticket_id
        for classification in classifications
        if classification.answerability in {"knowledge_gap", "order_lookup_required", "needs_human_review"}
    ]

    return ClassificationEvaluation(
        total_tickets=total,
        classified_tickets=total,
        required_persona_counts=dict(persona_counts),
        csv_persona_counts=dict(csv_persona_counts),
        answerability_counts=dict(answerability_counts),
        operational_tag_counts=dict(tag_counts),
        question_type_counts=dict(question_type_counts),
        order_lookup_required_count=answerability_counts["order_lookup_required"],
        knowledge_gap_count=answerability_counts["knowledge_gap"],
        needs_human_review_count=answerability_counts["needs_human_review"],
        escalation_matches_csv=escalation_matches,
        escalation_accuracy=_ratio(escalation_matches, total),
        answerability_matches_csv=answerability_matches,
        answerability_label_accuracy=_ratio(answerability_matches, total),
        final_personas=REQUIRED_PERSONAS,
        exposes_transactional_persona=False,
        tricky_case_ticket_ids=tricky_case_ids,
    )


def normalize_question(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def extract_order_ids(ticket: TicketRecord, question_text: str) -> list[str]:
    values = []
    if ticket.order_id:
        values.append(ticket.order_id.upper())
    values.extend(match.upper() for match in ORDER_ID_PATTERN.findall(question_text))
    return _unique(values)


def extract_tracking_ids(question_text: str) -> list[str]:
    return _unique(match.upper() for match in TRACKING_PATTERN.findall(question_text))


def infer_question_type_hints(csv_question_type: str, normalized_question: str) -> list[str]:
    hints = [csv_question_type]
    for intent, keywords in INTENT_KEYWORDS.items():
        if intent != csv_question_type and any(keyword in normalized_question for keyword in keywords):
            hints.append(intent)
    return _unique(hints)


def decide_persona(ticket: TicketRecord, normalized_question: str) -> PersonaDecision:
    for persona, terms, reasoning in PERSONA_RULES:
        matches = [term for term in terms if term in normalized_question]
        if matches:
            confidence = 0.95 if len(matches) > 1 else 0.86
            return PersonaDecision(
                persona=persona,
                confidence=confidence,
                trigger_terms=matches,
                reasoning=reasoning,
            )

    csv_fallback = {
        "health_conscious": "Health-Conscious Buyer",
        "gifter": "Gifter",
        "owner_aftercare": "Active / Outdoor Buyer",
        "enthusiast": "Active / Outdoor Buyer",
        "prospect": "Enthusiast / Collector",
        "niche_buyer": "Enthusiast / Collector",
    }
    if ticket.buyer_persona in csv_fallback:
        return PersonaDecision(
            persona=csv_fallback[ticket.buyer_persona],  # type: ignore[arg-type]
            confidence=0.65,
            trigger_terms=[f"csv:{ticket.buyer_persona}"],
            reasoning="No stronger text signal was found, so the CSV label was mapped to a required persona.",
        )

    return PersonaDecision(
        persona="Enthusiast / Collector",
        confidence=0.45,
        trigger_terms=["default_general_watch_buyer"],
        reasoning=(
            "No required persona signal was found. The ticket is operational, so it is "
            "kept out of a transactional final persona and assigned to the broad watch-buyer persona."
        ),
    )


def infer_operational_tags(
    ticket: TicketRecord,
    normalized_question: str,
    order_ids: list[str],
    tracking_ids: list[str],
) -> list[OperationalTag]:
    tags: list[OperationalTag] = []

    if ticket.question_type == "order_status" or order_ids or tracking_ids:
        tags.extend(["order_lookup_required", "transactional_context"])
    if ticket.question_type == "knowledge_gap" or _contains_any(normalized_question, KNOWLEDGE_GAP_TERMS):
        tags.append("knowledge_gap")
    if _contains_any(normalized_question, PRICING_TERMS):
        tags.append("pricing_question")
    if _contains_any(normalized_question, PERSONA_RULES[1][1]):
        tags.append("safety_question")
    if _contains_any(normalized_question, PERSONA_RULES[2][1]):
        tags.append("gift_or_personalisation")
    if _contains_any(normalized_question, PERSONA_RULES[3][1]):
        tags.append("outdoor_use")
    if _contains_any(normalized_question, PERSONA_RULES[0][1]):
        tags.append("sustainability_signal")
    if _contains_any(normalized_question, CONFLICT_CONTEXT_TERMS) and ticket.question_type in {
        "engraving",
        "servicing",
    }:
        tags.append("source_conflict_possible")
    if _contains_any(normalized_question, ["bulk", "wholesale", "corporate"]):
        tags.append("corporate_or_bulk")
    if ticket.question_type == "servicing" or _contains_any(normalized_question, ["service", "battery"]):
        tags.append("aftercare_or_servicing")
    if _contains_any(normalized_question, PERSONA_RULES[4][1]):
        tags.append("collector_or_specs")

    return _unique(tags)


def decide_answerability(
    ticket: TicketRecord,
    normalized_question: str,
    tags: list[OperationalTag],
) -> AnswerabilityState:
    if "order_lookup_required" in tags:
        return "order_lookup_required"
    if ticket.question_type == "knowledge_gap" or _contains_any(normalized_question, KNOWLEDGE_GAP_TERMS):
        return "knowledge_gap"
    if _contains_any(normalized_question, HUMAN_REVIEW_TERMS) or "corporate_or_bulk" in tags:
        return "needs_human_review"
    return "answerable"


def explain_routing(
    answerability: AnswerabilityState,
    tags: list[OperationalTag],
    normalized_question: str,
) -> str:
    if answerability == "order_lookup_required":
        return "Requires Shopify, carrier, refund, or order-system lookup before a customer answer."
    if answerability == "knowledge_gap":
        return "Static KB coverage is insufficient for this question; route to human resolution before answering."
    if answerability == "needs_human_review":
        if "corporate_or_bulk" in tags:
            return "Bulk or corporate enquiries should route to the team before confirmation."
        if "older model" in normalized_question or "discontinued" in normalized_question:
            return "Older or discontinued model servicing needs team confirmation on parts and pricing."
        return "The question is answerable only after human review of policy or commercial context."
    if "source_conflict_possible" in tags:
        return "Likely answerable, but later retrieval must prefer rate cards over SOP wording."
    return "Likely answerable from the local knowledge base in later retrieval phases."


def _contains_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def _unique(values: Iterable[str]) -> list[str]:
    seen = set()
    output = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        output.append(value)
    return output


def _ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)
