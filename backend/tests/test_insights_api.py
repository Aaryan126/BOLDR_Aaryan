from fastapi.testclient import TestClient

from app.main import create_app


EXPECTED_THEMES = {
    "Materials and Safety",
    "Engraving and Personalisation",
    "Strap Compatibility",
    "Watch Servicing and Aftercare",
    "Orders, Shipping, and Returns",
    "Active and Outdoor Use",
    "Sustainability and Ethics",
    "Collector and Technical Specs",
    "Corporate and Gifting",
}


def test_theme_radar_clusters_all_tickets_into_expected_themes() -> None:
    client = TestClient(create_app())

    response = client.get("/api/themes/radar")

    assert response.status_code == 200
    body = response.json()
    meta = body["meta"]
    themes = body["data"]
    assert meta["total_ticket_count"] == 70
    assert meta["clustered_ticket_count"] == 70
    assert meta["theme_count"] == len(EXPECTED_THEMES)
    assert {theme["theme_name"] for theme in themes} == EXPECTED_THEMES
    assert all(theme["frequency"] >= 1 for theme in themes)
    assert all(theme["representative_ticket_ids"] for theme in themes)
    assert all(theme["evidence"] for theme in themes)
    assert any(theme["product_page_gap"] for theme in themes)
    assert any(theme["gap_count"] >= 1 for theme in themes)


def test_theme_radar_includes_persona_answerability_and_actions() -> None:
    client = TestClient(create_app())

    response = client.get("/api/themes/radar")

    assert response.status_code == 200
    sustainability = next(
        theme
        for theme in response.json()["data"]
        if theme["theme_name"] == "Sustainability and Ethics"
    )
    assert sustainability["marketing_signal"] is True
    assert sustainability["product_page_gap"] is True
    assert "Sustainability Advocate" in sustainability["persona_breakdown"]
    assert "knowledge_gap" in sustainability["answerability_breakdown"]
    assert "sustainability roadmap" in sustainability["recommended_marketing_action"]


def test_marketing_brief_contains_evidence_personas_and_actions() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/marketing-briefs/generate",
        json={"period_label": "Demo Month"},
    )

    assert response.status_code == 200
    brief = response.json()["data"]
    assert brief["period_label"] == "Demo Month"
    assert brief["source_ticket_count"] == 70
    assert brief["theme_count"] == len(EXPECTED_THEMES)
    assert "What Customers Are Asking That Product Pages Should Answer Better" in brief["markdown"]
    assert "Unanswerable Or Decision-Required Themes" in brief["markdown"]
    assert "Persona-Led Campaign Angles" in brief["markdown"]
    assert "TKT-" in brief["markdown"]
    assert brief["opportunities"]
    assert all(opportunity["persona_focus"] for opportunity in brief["opportunities"])
    assert all(opportunity["evidence_ticket_ids"] for opportunity in brief["opportunities"])
    assert any(
        opportunity["product_page_update_needed"]
        for opportunity in brief["opportunities"]
    )


def test_insights_contracts_are_in_openapi() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/themes/radar" in paths
    assert "/api/marketing-briefs/current" in paths
    assert "/api/marketing-briefs/generate" in paths
