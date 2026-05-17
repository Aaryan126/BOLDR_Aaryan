from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


ExternalSourceType = Literal[
    "reddit",
    "watch_forum",
    "review_platform",
    "competitor_review",
    "industry_article",
]
ExternalSentiment = Literal[
    "positive",
    "concerned",
    "mixed",
    "opportunity",
]
ExternalSignalStrength = Literal[
    "directional",
    "moderate",
    "strong",
]
BenchmarkClassification = Literal[
    "boldr_specific_gap",
    "market_wide_signal",
    "market_wide_concern_with_boldr_gap",
    "covered_but_under_merchandised",
]


class ExternalSource(BaseModel):
    source_id: str
    name: str
    source_type: ExternalSourceType
    url: str
    rationale: str
    buyer_signals: list[str]
    limitations: str


class ExternalMention(BaseModel):
    mention_id: str
    source_id: str
    theme_key: str
    source_url: str
    source_title: str
    sentiment: ExternalSentiment
    mention_count: int
    representative_claims: list[str]
    captured_at: str


class BenchmarkExternalSourceSummary(BaseModel):
    source_id: str
    name: str
    source_type: ExternalSourceType
    source_url: str
    mention_count: int
    sentiment: ExternalSentiment
    representative_claims: list[str]


class ExternalBenchmark(BaseModel):
    theme_key: str
    theme: str
    internal_theme_names: list[str]
    internal_ticket_count: int
    internal_ticket_ids: list[str]
    internal_personas: list[str]
    external_sources: list[BenchmarkExternalSourceSummary]
    external_source_count: int
    external_source_type_count: int
    external_mention_count: int
    external_sentiment: ExternalSentiment
    signal_strength: ExternalSignalStrength
    classification: BenchmarkClassification
    benchmark_rationale: str
    recommended_action: str
    validation_steps: list[str]
    confidence: float
    source_urls: list[str]
    source_limitations: list[str]


class ExternalSourceListResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[ExternalSource]


class ExternalMentionListResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[ExternalMention]


class ExternalBenchmarkResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[ExternalBenchmark]
