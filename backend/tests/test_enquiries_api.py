from fastapi.testclient import TestClient

from app.main import create_app


def test_create_answerable_custom_enquiry_waits_for_approval() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/enquiries",
        json={
            "message": (
                "Are BOLDR's FKM rubber straps BPA-free and safe for kids with "
                "sensitive skin?"
            ),
            "customer_name": "Avery Tan",
            "customer_email": "avery@example.com",
            "source": "judge_chat",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "awaiting_approval"
    assert body["classification"]["persona"] == "Health-Conscious Buyer"
    assert body["classification"]["answerability"] == "answerable"
    assert body["retrieval"]["sufficient_evidence"] is True
    assert body["draft"]["decision"]["reply_type"] == "customer_reply"
    assert body["approval_state"]["status"] == "needs_review"
    assert body["customer_visible_response"] is None
    assert any(
        event["step"] == "searching_knowledge_base"
        and event["source_refs"]
        for event in body["processing_trace"]
    )


def test_approve_answerable_enquiry_makes_reply_visible() -> None:
    client = TestClient(create_app())
    created = client.post(
        "/api/enquiries",
        json={"message": "Are BOLDR straps BPA-free for a child?"},
    ).json()

    approved = client.post(
        f"/api/enquiries/{created['enquiry_id']}/approve",
        json={
            "status": "edited_and_approved",
            "edited_reply": "Yes. Current FKM rubber and nylon NATO straps are BPA-free.",
            "reviewer_note": "Tightened for chat.",
        },
    )

    assert approved.status_code == 200
    body = approved.json()
    assert body["state"] == "approved"
    assert body["approval_state"]["status"] == "edited_and_approved"
    assert body["customer_visible_response"].startswith("Yes. Current FKM")


def test_create_gap_custom_enquiry_routes_to_cs_without_customer_answer() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/enquiries",
        json={
            "message": (
                "Are your straps vegan, and do you offer carbon-neutral shipping "
                "or a recycling take-back program?"
            )
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "needs_team_confirmation"
    assert body["classification"]["persona"] == "Sustainability Advocate"
    assert body["draft"]["decision"]["reply_type"] == "holding_reply"
    assert body["customer_visible_response"] is None
    assert body["gap_state"]["status"] == "needs_resolution"
    assert body["gap_state"]["marketing_signal"] is True
    assert any(event["step"] == "routing_to_cs" for event in body["processing_trace"])


def test_gap_resolution_kb_draft_and_review_transitions() -> None:
    client = TestClient(create_app())
    created = client.post(
        "/api/enquiries",
        json={"message": "Do you offer carbon-neutral shipping for BOLDR watches?"},
    ).json()
    enquiry_id = created["enquiry_id"]

    premature = client.post(f"/api/enquiries/{enquiry_id}/draft-kb")
    assert premature.status_code == 409

    resolved = client.post(
        f"/api/enquiries/{enquiry_id}/resolve-gap",
        json={
            "human_resolution": (
                "BOLDR is not currently claiming carbon-neutral shipping. "
                "We use recyclable packaging where available and are assessing "
                "carrier offset options."
            ),
            "reviewer_note": "Confirmed by operations.",
        },
    )
    assert resolved.status_code == 200
    assert resolved.json()["state"] == "gap_resolved"

    drafted = client.post(f"/api/enquiries/{enquiry_id}/draft-kb")
    assert drafted.status_code == 200
    drafted_body = drafted.json()
    assert drafted_body["state"] == "kb_draft_ready"
    assert drafted_body["gap_state"]["kb_draft"]["faq_section"] == (
        "Sustainability and Materials"
    )

    reviewed = client.post(
        f"/api/enquiries/{enquiry_id}/review-kb",
        json={"status": "approved", "reviewer_note": "Approved for FAQ draft queue."},
    )
    assert reviewed.status_code == 200
    reviewed_body = reviewed.json()
    assert reviewed_body["state"] == "kb_approved"
    assert reviewed_body["gap_state"]["status"] == "approved"
    assert reviewed_body["gap_state"]["kb_reviewed_at"]


def test_sample_ticket_path_uses_dataset_ticket() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/enquiries",
        json={"message": "Use the sample ticket.", "sample_ticket_id": "TKT-1048"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["sample_ticket_id"] == "TKT-1048"
    assert body["ticket"]["ticket_id"].startswith("ENQ-")
    assert body["classification"]["ticket_id"] == body["enquiry_id"]


def test_reset_enquiries_clears_demo_records_and_restarts_ids() -> None:
    client = TestClient(create_app())
    client.post("/api/enquiries/reset")

    first = client.post(
        "/api/enquiries",
        json={"message": "Are BOLDR straps BPA-free for kids?"},
    ).json()
    second = client.post(
        "/api/enquiries",
        json={"message": "Do you offer carbon-neutral shipping?"},
    ).json()

    assert first["enquiry_id"] == "ENQ-0001"
    assert second["enquiry_id"] == "ENQ-0002"

    reset = client.post("/api/enquiries/reset")

    assert reset.status_code == 200
    assert reset.json() == {
        "status": "reset",
        "cleared_count": 2,
        "next_enquiry_id": "ENQ-0001",
    }
    assert client.get("/api/enquiries").json() == []

    restarted = client.post(
        "/api/enquiries",
        json={"message": "Can I engrave a caseback gift message?"},
    ).json()
    assert restarted["enquiry_id"] == "ENQ-0001"
