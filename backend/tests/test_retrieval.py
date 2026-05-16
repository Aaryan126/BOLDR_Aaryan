from fastapi.testclient import TestClient

from app.main import create_app
from app.services.classifications import list_ticket_classifications
from app.services.retrieval import (
    get_retrieval_evaluation,
    search_knowledge,
    search_ticket_evidence,
)


def test_golden_queries_retrieve_authoritative_sources() -> None:
    expectations = {
        "Are Boldr straps BPA-free?": {"04_faq_document.pdf", "05b_product_reference.docx"},
        "What grade of titanium is used in the Expedition?": {"05b_product_reference.docx"},
        "How much does caseback engraving cost?": {"03a_rate_card_engraving.csv"},
        "Would a regulation service fix my watch losing time?": {"03b_rate_card_servicing.csv"},
        "Can I swap straps between Expedition and Journey?": {
            "04_faq_document.pdf",
            "05b_product_reference.docx",
        },
        "What is your return policy?": {"04_faq_document.pdf"},
    }

    for query, expected_sources in expectations.items():
        result = search_knowledge(query)

        assert result.sufficient_evidence is True
        assert result.evidence
        assert result.evidence[0].source_file in expected_sources
        assert result.evidence[0].supports_answer is True


def test_rate_card_conflicts_prefer_structured_sources() -> None:
    engraving = search_knowledge("How much does caseback engraving cost?")
    servicing = search_knowledge("What is the servicing price and turnaround?")

    assert engraving.evidence[0].source_file == "03a_rate_card_engraving.csv"
    assert engraving.evidence[0].match_type == "structured"
    assert engraving.conflict_warnings[0].authoritative_source == "03a_rate_card_engraving.csv"

    assert servicing.evidence[0].source_file == "03b_rate_card_servicing.csv"
    assert servicing.evidence[0].match_type == "structured"
    assert servicing.conflict_warnings[0].authoritative_source == "03b_rate_card_servicing.csv"


def test_unsupported_themes_are_not_answerable() -> None:
    queries = [
        "Do you offer carbon-neutral shipping?",
        "Do you have a strap recycling programme?",
        "Is the movement resistant to MRI magnetic fields?",
    ]

    for query in queries:
        result = search_knowledge(query)

        assert result.sufficient_evidence is False
        assert result.unsupported_terms
        assert result.insufficiency_reason is not None
        assert all(evidence.supports_answer is False for evidence in result.evidence)


def test_ticket_evidence_covers_answerable_tickets_and_blocks_known_gap() -> None:
    classifications = list_ticket_classifications()
    answerable_ticket_ids = [
        classification.ticket_id
        for classification in classifications
        if classification.answerability == "answerable"
    ]

    for ticket_id in answerable_ticket_ids:
        result = search_ticket_evidence(ticket_id)
        assert result is not None
        assert result.evidence

    carbon_shipping = search_ticket_evidence("TKT-1013")
    assert carbon_shipping is not None
    assert carbon_shipping.sufficient_evidence is False
    assert carbon_shipping.unsupported_terms == ["carbon-neutral shipping"]


def test_retrieval_evaluation_phase_gate_metrics() -> None:
    evaluation = get_retrieval_evaluation()

    assert evaluation.total_tickets == 70
    assert evaluation.answerable_with_evidence_count == evaluation.answerable_ticket_count
    assert evaluation.known_unsupported_blocked_count == evaluation.known_unsupported_ticket_count
    assert evaluation.golden_query_pass_count == evaluation.golden_query_count
    assert evaluation.source_priority_checks_passed is True
    assert set(evaluation.search_methods) == {"structured", "keyword", "vector"}


def test_retrieval_api_endpoints() -> None:
    client = TestClient(create_app())

    evaluation = client.get("/api/retrieval/evaluation")
    assert evaluation.status_code == 200
    assert evaluation.json()["golden_query_pass_count"] == 6

    search = client.get(
        "/api/retrieval/search",
        params={"query": "What is your return policy?"},
    )
    assert search.status_code == 200
    assert search.json()["evidence"][0]["source_file"] == "04_faq_document.pdf"

    ticket = client.get("/api/retrieval/tickets/TKT-1048")
    assert ticket.status_code == 200
    assert ticket.json()["sufficient_evidence"] is True

    missing = client.get("/api/retrieval/tickets/TKT-DOES-NOT-EXIST")
    assert missing.status_code == 404
