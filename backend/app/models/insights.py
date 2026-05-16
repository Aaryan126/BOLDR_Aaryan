from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


ThemeTrendDirection = Literal["rising", "stable", "falling"]


class ThemeEvidence(BaseModel):
    ticket_id: str
    subject: str
    persona: str
    answerability: str
    customer_wording: str


class ThemeRadarItem(BaseModel):
    theme_name: str
    frequency: int
    trend_direction: ThemeTrendDirection
    representative_ticket_ids: list[str]
    common_customer_wording: list[str]
    answerability_breakdown: dict[str, int]
    persona_breakdown: dict[str, int]
    recommended_kb_action: str
    recommended_marketing_action: str
    product_page_gap: bool
    marketing_signal: bool
    gap_count: int
    evidence: list[ThemeEvidence]


class ThemeRadarMeta(BaseModel):
    total_ticket_count: int
    clustered_ticket_count: int
    theme_count: int
    generated_at: str


class ThemeRadarResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: list[ThemeRadarItem]
    meta: ThemeRadarMeta


class MarketingOpportunity(BaseModel):
    theme_name: str
    persona_focus: list[str]
    insight: str
    recommended_action: str
    campaign_angle: str
    evidence_ticket_ids: list[str]
    product_page_update_needed: bool


class MarketingBrief(BaseModel):
    brief_id: str
    period_label: str
    generated_at: str
    source_ticket_count: int
    theme_count: int
    markdown: str
    opportunities: list[MarketingOpportunity]


class MarketingBriefRequest(BaseModel):
    period_label: str | None = None


class MarketingBriefResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: MarketingBrief
