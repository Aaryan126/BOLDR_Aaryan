from fastapi.testclient import TestClient

from app.main import create_app


def test_external_sources_include_multiple_source_types_and_limitations() -> None:
    client = TestClient(create_app())

    response = client.get("/api/external/sources")

    assert response.status_code == 200
    sources = response.json()["data"]
    source_types = {source["source_type"] for source in sources}
    assert len(sources) >= 4
    assert {"reddit", "watch_forum", "industry_article"}.issubset(source_types)
    assert all(source["url"].startswith("https://") for source in sources)
    assert all(source["limitations"] for source in sources)


def test_external_mentions_are_imported_with_source_urls() -> None:
    client = TestClient(create_app())

    response = client.get("/api/external/mentions")

    assert response.status_code == 200
    mentions = response.json()["data"]
    assert len(mentions) >= 6
    assert {mention["theme_key"] for mention in mentions} >= {
        "materials_safety",
        "strap_outdoor_safety",
        "sustainability",
    }
    assert all(mention["source_url"].startswith("https://") for mention in mentions)
    assert all(mention["representative_claims"] for mention in mentions)


def test_external_benchmarks_compare_internal_and_external_signals() -> None:
    client = TestClient(create_app())

    response = client.get("/api/external/benchmarks")

    assert response.status_code == 200
    benchmarks = response.json()["data"]
    assert len(benchmarks) >= 5
    required = {
        "materials_safety",
        "strap_outdoor_safety",
        "sustainability",
    }
    assert required.issubset({benchmark["theme_key"] for benchmark in benchmarks})
    for benchmark in benchmarks:
        assert benchmark["internal_ticket_count"] >= 1
        assert benchmark["internal_ticket_ids"]
        assert benchmark["internal_personas"]
        assert benchmark["external_sources"]
        assert benchmark["external_mention_count"] >= 1
        assert benchmark["classification"] in {
            "boldr_specific_gap",
            "market_wide_signal",
            "market_wide_concern_with_boldr_gap",
            "covered_but_under_merchandised",
        }
        assert benchmark["recommended_action"]
        assert benchmark["source_urls"]
        assert benchmark["source_limitations"]


def test_external_benchmarks_generate_matches_read_endpoint() -> None:
    client = TestClient(create_app())

    read_response = client.get("/api/external/benchmarks")
    generate_response = client.post("/api/external/benchmarks/generate")

    assert read_response.status_code == 200
    assert generate_response.status_code == 200
    assert generate_response.json()["data"] == read_response.json()["data"]


def test_external_contracts_are_in_openapi() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/external/sources" in paths
    assert "/api/external/mentions" in paths
    assert "/api/external/benchmarks" in paths
    assert "/api/external/benchmarks/generate" in paths
