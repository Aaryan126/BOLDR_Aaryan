from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "app": "BOLDR Revenue Rocket",
        "phase": "phase-1-scaffold",
    }


def test_meta_endpoint_lists_planned_modules() -> None:
    client = TestClient(create_app())

    response = client.get("/api/meta")

    assert response.status_code == 200
    body = response.json()
    assert body["app"] == "BOLDR Revenue Rocket"
    assert body["phase"] == "phase-1-scaffold"
    module_names = [module["name"] for module in body["modules"]]
    assert module_names == [
        "Inbox Intelligence",
        "Ticket Review",
        "Knowledge Gaps",
        "Theme Radar",
        "Marketing Brief",
        "External Benchmarking",
    ]


def test_dataset_diagnostics_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/api/datasets/diagnostics")

    assert response.status_code == 200
    body = response.json()
    assert body["actual_source_file_count"] == 6
    assert body["expected_brief_file_count"] == 11
    assert body["ticket_count"] == 70
    assert body["faq_entry_count"] == 32
    assert body["product_model_count"] == 3
    assert body["strap_item_count"] == 11


def test_dataset_sources_endpoint_lists_six_files() -> None:
    client = TestClient(create_app())

    response = client.get("/api/datasets/sources")

    assert response.status_code == 200
    sources = response.json()
    assert len(sources) == 6
    assert all(source["exists"] for source in sources)
    assert [source["file_name"] for source in sources] == [
        "01_customer_tickets.csv",
        "03a_rate_card_engraving.csv",
        "03b_rate_card_servicing.csv",
        "04_faq_document.pdf",
        "05a_SOP.docx",
        "05b_product_reference.docx",
    ]
