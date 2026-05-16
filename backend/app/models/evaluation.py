from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


MetricStatus = Literal["pass", "documented_exception", "fail"]
OverallQualityStatus = Literal["pass", "pass_with_notes", "fail"]


class QualityMetric(BaseModel):
    metric_id: str
    label: str
    value: float
    target: float
    unit: Literal["ratio", "count", "boolean"]
    status: MetricStatus
    numerator: int | None = None
    denominator: int | None = None
    detail: str


class GoldenFixtureResult(BaseModel):
    fixture_id: str
    ticket_id: str
    scenario: str
    expected_persona: str
    actual_persona: str
    expected_answerability: str
    actual_answerability: str
    expected_reply_type: str
    actual_reply_type: str
    evidence_required: bool
    evidence_count: int
    passed: bool
    notes: str


class QualityIssue(BaseModel):
    issue_id: str
    severity: Literal["low", "medium", "high"]
    area: str
    summary: str
    ticket_ids: list[str]
    recommended_action: str


class QualityScorecard(BaseModel):
    phase: str
    generated_at: str
    total_ticket_count: int
    overall_status: OverallQualityStatus
    metrics: list[QualityMetric]
    golden_fixtures: list[GoldenFixtureResult]
    issues: list[QualityIssue]
    summary: str


class QualityScorecardResponse(BaseModel):
    status: Literal["ok"] = "ok"
    data: QualityScorecard
