from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from app.models.classification import TicketClassification
from app.models.dataset import DatasetSnapshot, DocumentChunk, ProductModel, RateCardItem, StrapItem
from app.models.retrieval import ConflictWarning, EvidenceCard, RetrievalEvaluation, RetrievalResult

TOKEN_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)?")

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "do",
    "does",
    "for",
    "from",
    "get",
    "have",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "use",
    "what",
    "when",
    "which",
    "with",
    "you",
    "your",
}

UNSUPPORTED_THEMES: dict[str, list[str]] = {
    "carbon-neutral shipping": ["carbon-neutral", "carbon neutral", "carbon footprint", "offset"],
    "strap recycling": ["recycling", "take-back", "dispose responsibly"],
    "MRI or magnetic resistance": ["mri", "magnetic field", "magnetic resistance"],
    "altitude performance": ["altitude", "5,000m", "5000m"],
    "shock rating": ["shock resistance", "shock-rated", "rock climbing", "trail running"],
    "resale value": ["resale value", "hold their resale"],
    "independent watchmaker collaborations": ["independent watchmakers", "collaborate"],
    "vegan strap materials": ["vegan", "animal products"],
}

GENERIC_ONLY_MATCH_TERMS = {
    "boldr",
    "watch",
    "watches",
    "strap",
    "straps",
    "shipping",
    "return",
    "offer",
    "available",
    "current",
    "model",
    "models",
    "product",
    "time",
}

RATE_CARD_TOPIC_TERMS = {
    "engraving": [
        "engraving",
        "engrave",
        "caseback",
        "character",
        "characters",
        "arabic",
        "chinese",
        "japanese",
        "korean",
        "cjk",
        "logo",
        "symbol",
        "font",
        "rush engraving",
        "same-day",
    ],
    "servicing": [
        "servicing",
        "service",
        "regulation",
        "battery",
        "crystal",
        "gasket",
        "pressure test",
        "water resistance test",
        "polish",
        "losing",
        "seconds per day",
        "movement cleaning",
        "shipping surcharge",
        "warranty extension",
    ],
}

PRODUCT_REFERENCE_TERMS = [
    "bpa",
    "bpa-free",
    "nickel",
    "hypoallergenic",
    "reach",
    "rohs",
    "titanium",
    "grade",
    "miyota",
    "movement",
    "water resistance",
    "lume",
    "super-luminova",
    "lug width",
    "compatible",
    "compatibility",
    "quick-release",
    "rubber",
    "silicone",
    "fkm",
    "nato",
    "mesh",
    "bracelet",
    "strap",
]

STRAP_QUERY_TERMS = [
    "strap",
    "straps",
    "lug",
    "compatible",
    "compatibility",
    "quick-release",
    "nato",
    "rubber",
    "silicone",
    "fkm",
    "leather",
    "nylon",
    "mesh",
    "bracelet",
    "buckle",
    "skin",
    "bpa",
    "nickel",
    "hypoallergenic",
]

RATE_CARD_CONFLICT_TOPICS = {
    "engraving": {
        "category": "engraving",
        "authoritative_source": "03a_rate_card_engraving.csv",
        "lower_priority_sources": ["04_faq_document.pdf", "05a_SOP.docx"],
    },
    "servicing": {
        "category": "servicing",
        "authoritative_source": "03b_rate_card_servicing.csv",
        "lower_priority_sources": ["04_faq_document.pdf", "05a_SOP.docx"],
    },
}

GOLDEN_QUERIES = [
    (
        "Are Boldr straps BPA-free?",
        ("04_faq_document.pdf", "05b_product_reference.docx"),
    ),
    ("What grade of titanium is used in the Expedition?", ("05b_product_reference.docx",)),
    ("How much does caseback engraving cost?", ("03a_rate_card_engraving.csv",)),
    ("Would a regulation service fix my watch losing time?", ("03b_rate_card_servicing.csv",)),
    (
        "Can I swap straps between Expedition and Journey?",
        ("04_faq_document.pdf", "05b_product_reference.docx"),
    ),
    ("What is your return policy?", ("04_faq_document.pdf",)),
]


@dataclass(frozen=True)
class SearchDocument:
    document_id: str
    source_file: str
    source_type: str
    source_priority: int
    section_title: str
    text: str
    structured_data: dict


class EvidenceRetriever:
    def __init__(self, snapshot: DatasetSnapshot) -> None:
        self.snapshot = snapshot
        self.documents = self._build_search_documents(snapshot)
        self.document_tokens = {
            document.document_id: tokenize(document.text) for document in self.documents
        }
        self.idf = self._build_idf()

    def search(
        self,
        query: str,
        ticket_id: str | None = None,
        answerability_hint: str | None = None,
        limit: int = 8,
    ) -> RetrievalResult:
        normalized_query = normalize(query)
        query_tokens = tokenize(query)
        unsupported_terms = find_unsupported_terms(normalized_query)
        evidence = self._score_documents(query, query_tokens, unsupported_terms)
        evidence = evidence[:limit]
        conflict_warnings = detect_conflicts(normalized_query, evidence)
        sufficient_evidence = bool(evidence) and not unsupported_terms and evidence[0].confidence >= 0.28

        insufficiency_reason = None
        if unsupported_terms:
            insufficiency_reason = (
                "Question matches a known unsupported or unresolved theme in the local KB."
            )
        elif not evidence:
            insufficiency_reason = "No local source produced relevant evidence."
        elif not sufficient_evidence:
            insufficiency_reason = "Retrieved evidence is too weak for a supported customer answer."

        return RetrievalResult(
            query=query,
            normalized_query=normalized_query,
            ticket_id=ticket_id,
            answerability_hint=answerability_hint,
            sufficient_evidence=sufficient_evidence,
            insufficiency_reason=insufficiency_reason,
            unsupported_terms=unsupported_terms,
            evidence=evidence,
            conflict_warnings=conflict_warnings,
        )

    def search_ticket(self, classification: TicketClassification) -> RetrievalResult:
        return self.search(
            query=classification.question_text,
            ticket_id=classification.ticket_id,
            answerability_hint=classification.answerability,
            limit=8,
        )

    def evaluate(self, classifications: list[TicketClassification]) -> RetrievalEvaluation:
        ticket_results = [self.search_ticket(classification) for classification in classifications]
        answerable_results = [
            result
            for classification, result in zip(classifications, ticket_results, strict=True)
            if classification.answerability == "answerable"
        ]
        unsupported_results = [result for result in ticket_results if result.unsupported_terms]
        golden_passes = 0
        for query, expected_sources in GOLDEN_QUERIES:
            result = self.search(query)
            if result.evidence and result.evidence[0].source_file in expected_sources:
                golden_passes += 1

        return RetrievalEvaluation(
            total_tickets=len(classifications),
            answerable_ticket_count=len(answerable_results),
            answerable_with_evidence_count=sum(1 for result in answerable_results if result.evidence),
            known_unsupported_ticket_count=len(unsupported_results),
            known_unsupported_blocked_count=sum(
                1 for result in unsupported_results if not result.sufficient_evidence
            ),
            golden_query_count=len(GOLDEN_QUERIES),
            golden_query_pass_count=golden_passes,
            conflict_warning_count=sum(len(result.conflict_warnings) for result in ticket_results),
            source_priority_checks_passed=self._source_priority_checks_passed(),
            search_methods=["structured", "keyword", "vector"],
        )

    def _score_documents(
        self,
        query: str,
        query_tokens: list[str],
        unsupported_terms: list[str],
    ) -> list[EvidenceCard]:
        scored: list[EvidenceCard] = []
        normalized_query = normalize(query)
        query_counter = Counter(query_tokens)
        query_vector = {
            token: count * self.idf.get(token, 0.0) for token, count in query_counter.items()
        }

        for document in self.documents:
            document_tokens = self.document_tokens[document.document_id]
            if not document_tokens:
                continue

            matched_terms = sorted(set(query_tokens) & set(document_tokens))
            if not matched_terms:
                continue
            if generic_only_match(matched_terms) and not important_phrase_match(query, document.text):
                continue
            if strap_document_irrelevant(normalized_query, document):
                continue
            if document.source_type == "rate_card" and not rate_card_applies(normalized_query, document):
                continue

            keyword_score = len(matched_terms) / max(len(set(query_tokens)), 1)
            vector_score = cosine_similarity(query_vector, tf_idf_vector(document_tokens, self.idf))
            structured_bonus = structured_source_bonus(document)
            priority_bonus = max(0, 6 - document.source_priority) * 0.02
            exact_phrase_bonus = 0.18 if important_phrase_match(query, document.text) else 0.0
            score = (
                keyword_score
                + vector_score
                + structured_bonus
                + priority_bonus
                + exact_phrase_bonus
                + authoritative_domain_bonus(normalized_query, document)
            )
            confidence = min(round(score / 1.6, 4), 1.0)

            supports_answer = confidence >= 0.2 and not unsupported_terms
            match_type = match_type_for(document, keyword_score, exact_phrase_bonus)
            scored.append(
                EvidenceCard(
                    evidence_id=document.document_id,
                    source_file=document.source_file,
                    source_type=document.source_type,  # type: ignore[arg-type]
                    source_priority=document.source_priority,
                    section_title=document.section_title,
                    match_type=match_type,
                    score=round(score, 4),
                    confidence=confidence,
                    matched_terms=matched_terms[:12],
                    excerpt=excerpt_for_terms(document.text, matched_terms),
                    structured_data=document.structured_data,
                    supports_answer=supports_answer,
                )
            )

        return sorted(
            scored,
            key=lambda item: (
                not item.supports_answer,
                -item.score,
                item.source_priority,
                item.source_file,
            ),
        )

    def _build_search_documents(self, snapshot: DatasetSnapshot) -> list[SearchDocument]:
        documents: list[SearchDocument] = []
        for chunk in snapshot.document_chunks:
            documents.append(document_from_chunk(chunk))
        for item in snapshot.rate_card_items:
            documents.append(document_from_rate_card(item))
        for product in snapshot.product_models:
            documents.append(document_from_product(product))
        for strap in snapshot.strap_items:
            documents.append(document_from_strap(strap))
        return documents

    def _build_idf(self) -> dict[str, float]:
        document_count = len(self.documents)
        document_frequency: Counter[str] = Counter()
        for tokens in self.document_tokens.values():
            document_frequency.update(set(tokens))
        return {
            token: math.log((document_count + 1) / (frequency + 1)) + 1
            for token, frequency in document_frequency.items()
        }

    def _source_priority_checks_passed(self) -> bool:
        engraving = self.search("How much does caseback engraving cost?")
        servicing = self.search("How much does a regulation service cost?")
        return (
            bool(engraving.evidence)
            and engraving.evidence[0].source_file == "03a_rate_card_engraving.csv"
            and bool(servicing.evidence)
            and servicing.evidence[0].source_file == "03b_rate_card_servicing.csv"
        )


def document_from_chunk(chunk: DocumentChunk) -> SearchDocument:
    return SearchDocument(
        document_id=chunk.chunk_id,
        source_file=chunk.source_file,
        source_type=chunk.source_type,
        source_priority=chunk.source_priority,
        section_title=chunk.section_title,
        text=chunk.text,
        structured_data={},
    )


def document_from_rate_card(item: RateCardItem) -> SearchDocument:
    parts = [
        item.category,
        item.service,
        f"price SGD {item.price_sgd:g}" if item.price_sgd is not None else "",
        f"turnaround {item.turnaround_days}" if item.turnaround_days else "",
        f"includes {item.includes}" if item.includes else "",
        f"notes {item.notes}" if item.notes else "",
    ]
    return SearchDocument(
        document_id=f"{item.source_file}:{item.category}:{slug(item.service)}",
        source_file=item.source_file,
        source_type="rate_card",
        source_priority=item.source_priority,
        section_title=f"{item.category.title()} Rate Card",
        text=" | ".join(part for part in parts if part),
        structured_data=item.model_dump(),
    )


def document_from_product(product: ProductModel) -> SearchDocument:
    attributes = " | ".join(f"{key}: {value}" for key, value in product.attributes.items())
    text = f"{product.name} | SKU: {product.sku or ''} | SGD {product.price_sgd or ''} | {attributes}"
    return SearchDocument(
        document_id=f"05b_product_reference.docx:product:{slug(product.name)}",
        source_file="05b_product_reference.docx",
        source_type="product_reference",
        source_priority=2,
        section_title=f"Product Model: {product.name}",
        text=text,
        structured_data=product.model_dump(),
    )


def document_from_strap(strap: StrapItem) -> SearchDocument:
    text = (
        f"{strap.sku} | {strap.strap_type} | {strap.colour} | "
        f"BPA-free: {'YES' if strap.bpa_free else 'NO'} | SGD {strap.price_sgd or ''} | "
        f"Compatible with: {strap.compatible_with}"
    )
    return SearchDocument(
        document_id=f"05b_product_reference.docx:strap:{strap.sku}",
        source_file="05b_product_reference.docx",
        source_type="product_reference",
        source_priority=2,
        section_title="Strap Catalogue",
        text=text,
        structured_data=strap.model_dump(),
    )


def detect_conflicts(normalized_query: str, evidence: list[EvidenceCard]) -> list[ConflictWarning]:
    warnings: list[ConflictWarning] = []
    if not any(term in normalized_query for term in ["price", "cost", "turnaround", "fee", "service"]):
        return warnings

    for topic, config in RATE_CARD_CONFLICT_TOPICS.items():
        if not topic_matches(normalized_query, topic):
            continue
        authoritative_source = str(config["authoritative_source"])
        has_authoritative = any(item.source_file == authoritative_source for item in evidence)
        lower_priority_sources = [
            source
            for source in config["lower_priority_sources"]
            if any(item.source_file == source for item in evidence)
        ]
        if has_authoritative:
            warnings.append(
                ConflictWarning(
                    topic=topic,
                    message=(
                        f"{topic.title()} pricing or turnaround can appear in lower-priority docs. "
                        "Use the structured rate card as authoritative."
                    ),
                    authoritative_source=authoritative_source,
                    lower_priority_sources=lower_priority_sources,
                )
            )
    return warnings


def generic_only_match(matched_terms: list[str]) -> bool:
    return bool(matched_terms) and set(matched_terms).issubset(GENERIC_ONLY_MATCH_TERMS)


def rate_card_applies(query: str, document: SearchDocument) -> bool:
    category = str(document.structured_data.get("category", ""))
    return category in RATE_CARD_TOPIC_TERMS and topic_matches(query, category)


def strap_document_irrelevant(normalized_query: str, document: SearchDocument) -> bool:
    if not document.document_id.startswith("05b_product_reference.docx:strap:"):
        return False
    return not any(term in normalized_query for term in STRAP_QUERY_TERMS)


def structured_source_bonus(document: SearchDocument) -> float:
    if not document.structured_data:
        return 0.0
    if document.source_type == "rate_card":
        return 0.35
    if document.source_type == "product_reference":
        return 0.22
    return 0.14


def authoritative_domain_bonus(normalized_query: str, document: SearchDocument) -> float:
    if document.source_type == "rate_card" and rate_card_applies(normalized_query, document):
        return 0.45
    if (
        document.source_type == "product_reference"
        and any(term in normalized_query for term in PRODUCT_REFERENCE_TERMS)
    ):
        return 0.32
    return 0.0


def match_type_for(
    document: SearchDocument,
    keyword_score: float,
    exact_phrase_bonus: float,
) -> str:
    if document.structured_data and document.source_type == "rate_card":
        return "structured"
    if keyword_score >= 0.55 or exact_phrase_bonus:
        return "keyword"
    return "vector"


def topic_matches(normalized_query: str, topic: str) -> bool:
    return any(term in normalized_query for term in RATE_CARD_TOPIC_TERMS[topic])


def find_unsupported_terms(normalized_query: str) -> list[str]:
    matches: list[str] = []
    for label, terms in UNSUPPORTED_THEMES.items():
        if any(term in normalized_query for term in terms):
            matches.append(label)
    return matches


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in TOKEN_PATTERN.findall(normalize(text))
        if token not in STOPWORDS and len(token) > 1
    ]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().replace("—", "-").replace("–", "-")).strip()


def tf_idf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    counts = Counter(tokens)
    return {token: count * idf.get(token, 0.0) for token, count in counts.items()}


def cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    if not left or not right:
        return 0.0
    common = set(left) & set(right)
    numerator = sum(left[token] * right[token] for token in common)
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return numerator / (left_norm * right_norm)


def important_phrase_match(query: str, text: str) -> bool:
    normalized_query = normalize(query)
    normalized_text = normalize(text)
    phrases = [
        "bpa-free",
        "grade 5 titanium",
        "caseback engraving",
        "regulation service",
        "return policy",
        "strap compatibility",
        "lug width",
        "full service",
        "battery replacement",
    ]
    return any(phrase in normalized_query and phrase in normalized_text for phrase in phrases)


def excerpt_for_terms(text: str, matched_terms: list[str], radius: int = 220) -> str:
    if not text:
        return ""
    normalized_text = normalize(text)
    first_index = min(
        (normalized_text.find(term) for term in matched_terms if term in normalized_text),
        default=0,
    )
    start = max(first_index - radius // 2, 0)
    end = min(start + radius, len(text))
    excerpt = text[start:end].strip()
    if start > 0:
        excerpt = f"...{excerpt}"
    if end < len(text):
        excerpt = f"{excerpt}..."
    return excerpt


def slug(text: str) -> str:
    return "-".join(tokenize(text))[:80] or "item"
