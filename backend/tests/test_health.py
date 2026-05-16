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
