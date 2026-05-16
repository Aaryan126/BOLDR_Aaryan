from fastapi.testclient import TestClient

from app.main import create_app


def test_quality_scorecard_reports_thresholds_and_documented_exception() -> None:
    client = TestClient(create_app())

    response = client.get("/api/evaluation/scorecard")

    assert response.status_code == 200
    scorecard = response.json()["data"]
    assert scorecard["phase"] == "phase-11-quality-dashboard"
    assert scorecard["total_ticket_count"] == 70
    assert scorecard["overall_status"] == "pass_with_notes"

    metrics = {metric["metric_id"]: metric for metric in scorecard["metrics"]}
    assert metrics["answerability_accuracy"]["value"] >= 0.9
    assert metrics["answerability_accuracy"]["status"] == "pass"
    assert metrics["escalation_routing_accuracy"]["status"] == "documented_exception"
    assert metrics["escalation_routing_accuracy"]["value"] < 0.9
    assert "Mismatch ticket IDs" in metrics["escalation_routing_accuracy"]["detail"]
    assert metrics["persona_mapping_coverage"]["value"] == 1.0
    assert metrics["evidence_coverage"]["value"] == 1.0
    assert metrics["unsupported_claim_guardrails"]["value"] == 0.0
    assert metrics["source_conflict_handling"]["value"] == 1.0


def test_quality_scorecard_golden_fixtures_pass_core_scenarios() -> None:
    client = TestClient(create_app())

    response = client.get("/api/evaluation/scorecard")

    assert response.status_code == 200
    fixtures = response.json()["data"]["golden_fixtures"]
    assert len(fixtures) >= 6
    assert all(fixture["passed"] for fixture in fixtures)
    fixture_ids = {fixture["fixture_id"] for fixture in fixtures}
    assert {
        "golden-bpa-safety",
        "golden-carbon-gap",
        "golden-order-lookup",
        "golden-engraving-rate-card",
        "golden-servicing-human-review",
        "golden-vegan-strap-gap",
    }.issubset(fixture_ids)


def test_quality_scorecard_exposes_actionable_issues() -> None:
    client = TestClient(create_app())

    response = client.get("/api/evaluation/scorecard")

    assert response.status_code == 200
    issues = response.json()["data"]["issues"]
    assert issues
    issue = issues[0]
    assert issue["issue_id"] == "issue-escalation-label-disagreement"
    assert issue["severity"] == "medium"
    assert "TKT-1010" in issue["ticket_ids"]
    assert issue["recommended_action"]


def test_evaluation_contract_is_in_openapi() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/api/evaluation/scorecard" in response.json()["paths"]
