from fastapi.testclient import TestClient

from app.intelligence.classifier import classify_ticket, classify_tickets, evaluate_classifications
from app.services.datasets import get_dataset_snapshot
from app.main import create_app


def _ticket(ticket_id: str):
    snapshot = get_dataset_snapshot()
    return next(ticket for ticket in snapshot.tickets if ticket.ticket_id == ticket_id)


def test_required_persona_mapping_examples() -> None:
    examples = {
        "TKT-1048": "Health-Conscious Buyer",
        "TKT-1047": "Gifter",
        "TKT-1060": "Enthusiast / Collector",
        "TKT-1035": "Active / Outdoor Buyer",
        "TKT-1036": "Sustainability Advocate",
    }

    for ticket_id, expected_persona in examples.items():
        classification = classify_ticket(_ticket(ticket_id))
        assert classification.persona == expected_persona
        assert classification.persona != "transactional"
        assert classification.persona_trigger_terms


def test_order_lookup_extraction_and_routing() -> None:
    classification = classify_ticket(_ticket("TKT-1056"))

    assert classification.answerability == "order_lookup_required"
    assert classification.requires_escalation is True
    assert "order_lookup_required" in classification.operational_tags
    assert classification.extracted_order_ids == ["BLD-27477"]
    assert classification.extracted_tracking_ids == ["DHL9697354961"]


def test_known_gap_and_sustainability_signal() -> None:
    classification = classify_ticket(_ticket("TKT-1013"))

    assert classification.persona == "Sustainability Advocate"
    assert classification.answerability == "knowledge_gap"
    assert "knowledge_gap" in classification.operational_tags
    assert "sustainability_signal" in classification.operational_tags


def test_servicing_older_model_is_flagged_for_human_review() -> None:
    classification = classify_ticket(_ticket("TKT-1010"))

    assert classification.answerability == "needs_human_review"
    assert classification.requires_escalation is True
    assert "source_conflict_possible" in classification.operational_tags
    assert "aftercare_or_servicing" in classification.operational_tags


def test_evaluation_covers_all_tickets_and_required_personas() -> None:
    snapshot = get_dataset_snapshot()
    classifications = classify_tickets(snapshot.tickets)
    evaluation = evaluate_classifications(classifications)

    assert evaluation.total_tickets == 70
    assert evaluation.classified_tickets == 70
    assert evaluation.exposes_transactional_persona is False
    assert set(evaluation.final_personas) == {
        "Health-Conscious Buyer",
        "Gifter",
        "Enthusiast / Collector",
        "Active / Outdoor Buyer",
        "Sustainability Advocate",
    }
    assert set(evaluation.required_persona_counts) == set(evaluation.final_personas)
    assert evaluation.order_lookup_required_count == 10
    assert evaluation.knowledge_gap_count >= 9


def test_classification_api_endpoints() -> None:
    client = TestClient(create_app())

    evaluation = client.get("/api/intelligence/evaluation")
    assert evaluation.status_code == 200
    assert evaluation.json()["classified_tickets"] == 70

    ticket = client.get("/api/intelligence/classifications/TKT-1048")
    assert ticket.status_code == 200
    assert ticket.json()["persona"] == "Health-Conscious Buyer"

    missing = client.get("/api/intelligence/classifications/TKT-DOES-NOT-EXIST")
    assert missing.status_code == 404
