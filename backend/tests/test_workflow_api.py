from fastapi.testclient import TestClient

from app.main import create_app


def test_workflow_overview_reports_phase_7_endpoints() -> None:
    client = TestClient(create_app())

    response = client.get("/api/workflow/overview")

    assert response.status_code == 200
    body = response.json()
    assert body["phase"] == "phase-7-core-workflow-api"
    assert body["stable_endpoint_count"] >= 10
    assert body["ticket_count"] == 70
    assert body["draft_count"] == 70
    assert body["gap_count"] >= 8
    assert "resolve_gap" in body["supported_review_actions"]


def test_ticket_list_filters_and_response_envelope() -> None:
    client = TestClient(create_app())

    response = client.get(
        "/api/tickets",
        params={
            "persona": "Health-Conscious Buyer",
            "answerability": "answerable",
            "reply_type": "customer_reply",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["meta"]["returned"] >= 1
    assert body["meta"]["filters"]["persona"] == "Health-Conscious Buyer"
    assert all(
        ticket["persona"] == "Health-Conscious Buyer" for ticket in body["data"]
    )
    assert all(ticket["reply_type"] == "customer_reply" for ticket in body["data"])


def test_ticket_detail_and_intelligence_alias_include_full_trace() -> None:
    client = TestClient(create_app())

    detail = client.get("/api/tickets/TKT-1048")
    alias = client.get("/api/tickets/TKT-1048/intelligence")

    assert detail.status_code == 200
    assert alias.status_code == 200
    body = detail.json()["data"]
    assert body["workflow"]["ticket_id"] == "TKT-1048"
    assert body["ticket"]["ticket_id"] == "TKT-1048"
    assert body["classification"]["persona"] == "Health-Conscious Buyer"
    assert body["retrieval"]["sufficient_evidence"] is True
    assert body["draft"]["decision"]["reply_type"] == "customer_reply"
    assert alias.json()["data"]["workflow"] == body["workflow"]


def test_single_and_batch_processing_create_run_summaries() -> None:
    client = TestClient(create_app())

    single = client.post("/api/tickets/TKT-1048/process", json={})
    batch = client.post(
        "/api/tickets/process-batch",
        json={"ticket_ids": ["TKT-1048", "TKT-1013", "TKT-MISSING"]},
    )

    assert single.status_code == 200
    assert single.json()["meta"]["run_type"] == "single_ticket"
    assert single.json()["meta"]["processed_ticket_count"] == 1

    assert batch.status_code == 200
    batch_body = batch.json()
    assert batch_body["meta"]["run_type"] == "batch"
    assert batch_body["meta"]["processed_ticket_count"] == 2
    assert batch_body["meta"]["missing_ticket_ids"] == ["TKT-MISSING"]
    assert {ticket["ticket_id"] for ticket in batch_body["data"]} == {
        "TKT-1048",
        "TKT-1013",
    }


def test_gap_resolution_and_kb_draft_flow() -> None:
    client = TestClient(create_app())

    gaps = client.get("/api/gaps")
    assert gaps.status_code == 200
    gap_ids = {gap["gap_id"] for gap in gaps.json()["data"]}
    assert "gap-carbon-neutral-shipping" in gap_ids

    unresolved_draft = client.post("/api/gaps/gap-strap-recycling/draft-kb-entry")
    assert unresolved_draft.status_code == 409

    resolve = client.post(
        "/api/gaps/gap-carbon-neutral-shipping/resolve",
        json={
            "human_resolution": (
                "BOLDR is not currently claiming carbon-neutral shipping. "
                "We use recyclable packaging where available and are assessing "
                "carrier offset options."
            ),
            "reviewer_note": "Policy confirmed by operations.",
        },
    )
    assert resolve.status_code == 200
    resolved_gap = resolve.json()["data"]
    assert resolved_gap["status"] == "resolved_needs_kb_draft"
    assert resolved_gap["human_resolution"].startswith("BOLDR is not currently")

    kb_draft = client.post("/api/gaps/gap-carbon-neutral-shipping/draft-kb-entry")
    assert kb_draft.status_code == 200
    drafted_gap = kb_draft.json()["data"]
    assert drafted_gap["status"] == "kb_draft_ready"
    assert drafted_gap["kb_draft"]["faq_section"] == "Sustainability and Materials"
    assert drafted_gap["kb_draft"]["question"] == "Do you offer carbon-neutral shipping?"
    assert "TKT-1013" in drafted_gap["kb_draft"]["source_ticket_ids"]


def test_workflow_404s_are_readable() -> None:
    client = TestClient(create_app())

    missing_ticket = client.get("/api/tickets/TKT-DOES-NOT-EXIST")
    missing_gap = client.get("/api/gaps/gap-does-not-exist")

    assert missing_ticket.status_code == 404
    assert missing_ticket.json()["detail"] == "Ticket not found: TKT-DOES-NOT-EXIST"
    assert missing_gap.status_code == 404
    assert missing_gap.json()["detail"] == "Gap not found: gap-does-not-exist"


def test_workflow_contracts_are_in_openapi_and_validate_query_values() -> None:
    client = TestClient(create_app())

    invalid_query = client.get("/api/tickets", params={"answerability": "made_up"})
    openapi = client.get("/openapi.json")

    assert invalid_query.status_code == 422
    assert openapi.status_code == 200
    paths = openapi.json()["paths"]
    assert "/api/workflow/overview" in paths
    assert "/api/tickets/process-batch" in paths
    assert "/api/gaps/{gap_id}/draft-kb-entry" in paths
