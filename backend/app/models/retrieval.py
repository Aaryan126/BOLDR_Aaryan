from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.dataset import SourceType

EvidenceMatchType = Literal["structured", "keyword", "vector"]


class EvidenceCard(BaseModel):
    evidence_id: str
    source_file: str
    source_type: SourceType | Literal["rate_card"]
    source_priority: int
    section_title: str
    match_type: EvidenceMatchType
    score: float
    confidence: float
    matched_terms: list[str]
    excerpt: str
    structured_data: dict[str, Any] = Field(default_factory=dict)
    supports_answer: bool


class ConflictWarning(BaseModel):
    topic: str
    message: str
    authoritative_source: str
    lower_priority_sources: list[str]


class RetrievalResult(BaseModel):
    query: str
    normalized_query: str
    ticket_id: str | None = None
    answerability_hint: str | None = None
    sufficient_evidence: bool
    insufficiency_reason: str | None = None
    unsupported_terms: list[str]
    evidence: list[EvidenceCard]
    conflict_warnings: list[ConflictWarning]


class RetrievalEvaluation(BaseModel):
    total_tickets: int
    answerable_ticket_count: int
    answerable_with_evidence_count: int
    known_unsupported_ticket_count: int
    known_unsupported_blocked_count: int
    golden_query_count: int
    golden_query_pass_count: int
    conflict_warning_count: int
    source_priority_checks_passed: bool
    search_methods: list[EvidenceMatchType]
