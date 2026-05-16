from fastapi.testclient import TestClient

from app.intelligence.ai_provider import FakeAIProvider
from app.intelligence.drafting import generate_ticket_draft
from app.main import create_app
from app.models.ai import DraftReplyOutput
from app.services.classifications import get_ticket_classification
from app.services.drafts import get_draft_evaluation, get_ticket_draft, list_ticket_drafts
from app.services.retrieval import search_ticket_evidence

BANNED_PHRASES = ["Dear Sir/Madam", "Great question!"]
RAW_REPLY_PREFIX = "Based on the current BOLDR knowledge base"
RAW_REPLY_MARKERS = [" | ", "STR-", "..."]


def _draft(ticket_id: str):
    draft = get_ticket_draft(ticket_id)
    assert draft is not None
    return draft


def test_golden_answerable_ticket_drafts_are_evidence_backed() -> None:
    examples = {
        "TKT-1048": ["BPA-free", "FKM rubber", "nylon"],
        "TKT-1047": ["SGD 25", "SGD 40", "60 characters"],
        "TKT-1026": ["Full Service", "SGD 160", "water-resistance test"],
        "TKT-1025": ["Expedition", "Journey", "Grade 5"],
        "TKT-1011": ["20mm", "swapped", "quick-release"],
    }

    for ticket_id, expected_terms in examples.items():
        draft = _draft(ticket_id)

        assert draft.decision.reply_type == "customer_reply"
        assert draft.decision.can_send_to_customer is True
        assert draft.draft.evidence_ids
        assert draft.draft.claims
        assert all(term in draft.draft.draft_reply for term in expected_terms)
        assert all(guardrail.passed for guardrail in draft.guardrails)


def test_unsupported_questions_create_holding_replies_and_gap_records() -> None:
    examples = {
        "TKT-1013": "carbon-neutral shipping",
        "TKT-1028": "strap recycling",
        "TKT-1046": "MRI or magnetic resistance",
    }

    for ticket_id, expected_gap in examples.items():
        draft = _draft(ticket_id)

        assert draft.decision.reply_type == "holding_reply"
        assert draft.decision.can_send_to_customer is False
        assert draft.gap_record is not None
        assert draft.gap_record.gap_theme == expected_gap
        assert draft.draft.claims == []
        assert "I do not want to confirm" in draft.draft.draft_reply
        assert all(guardrail.passed for guardrail in draft.guardrails)


def test_order_specific_ticket_generates_internal_note_without_inventing_status() -> None:
    draft = _draft("TKT-1056")

    assert draft.decision.reply_type == "internal_note"
    assert draft.decision.customer_facing is False
    assert draft.decision.can_send_to_customer is False
    assert "DHL9697354961" in draft.draft.draft_reply
    assert "package is delayed" not in draft.draft.draft_reply.lower()
    assert all(guardrail.passed for guardrail in draft.guardrails)


def test_titanium_stainless_reply_is_customer_readable() -> None:
    draft = _draft("TKT-1039")
    reply_text = draft.draft.draft_reply

    assert draft.decision.reply_type == "customer_reply"
    assert "titanium" in reply_text.lower()
    assert "stainless steel" in reply_text.lower()
    assert "lighter" in reply_text.lower() or "weight" in reply_text.lower()
    assert RAW_REPLY_PREFIX not in reply_text
    assert " | " not in reply_text
    assert "STR-" not in reply_text
    assert "customer_safe_wording" in {guardrail.name for guardrail in draft.guardrails}
    assert all(guardrail.passed for guardrail in draft.guardrails)


def test_product_price_question_lists_matching_variants() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/enquiries",
        json={"message": "How much does Expedition Titanium cost?"},
    )

    assert response.status_code == 200
    reply_text = response.json()["draft"]["draft"]["draft_reply"]
    assert "Expedition Titanium" in reply_text
    assert "SGD 485" in reply_text
    assert "Expedition Titanium - Ember Limited Edition" in reply_text
    assert "SGD 595" in reply_text
    assert "Grade 5" not in reply_text


def test_live_ai_draft_path_accepts_grounded_structured_reply() -> None:
    classification = get_ticket_classification("TKT-1048")
    retrieval = search_ticket_evidence("TKT-1048")
    assert classification is not None
    assert retrieval is not None
    evidence_id = retrieval.evidence[0].evidence_id
    provider = FakeAIProvider(
        DraftReplyOutput(
            ticket_id="TKT-1048",
            reply_type="customer_reply",
            draft_reply="Current FKM rubber and nylon NATO straps are BPA-free.",
            evidence_ids=[evidence_id],
            claims=["Current FKM rubber and nylon NATO straps are BPA-free."],
            approval_status="draft",
        ).model_dump()
    )

    draft = generate_ticket_draft(
        classification,
        retrieval,
        use_live_ai=True,
        ai_provider=provider,
    )

    assert draft.decision.reply_type == "customer_reply"
    assert draft.draft.draft_reply == "Current FKM rubber and nylon NATO straps are BPA-free."
    assert draft.draft.evidence_ids == [evidence_id]
    assert all(guardrail.passed for guardrail in draft.guardrails)


def test_required_live_ai_failure_blocks_template_fallback() -> None:
    classification = get_ticket_classification("TKT-1048")
    retrieval = search_ticket_evidence("TKT-1048")
    assert classification is not None
    assert retrieval is not None
    provider = FakeAIProvider("not valid json")

    draft = generate_ticket_draft(
        classification,
        retrieval,
        use_live_ai=True,
        ai_provider=provider,
    )

    assert draft.decision.reply_type == "internal_note"
    assert draft.decision.can_send_to_customer is False
    assert "Live AI drafting was required" in draft.decision.reasons[-1]
    assert "BPA-free" not in draft.draft.draft_reply


def test_all_customer_facing_claims_are_evidence_backed_and_clean() -> None:
    for draft in list_ticket_drafts():
        reply_text = draft.draft.draft_reply
        assert all(phrase not in reply_text for phrase in BANNED_PHRASES)

        if draft.decision.reply_type == "customer_reply":
            assert draft.draft.claims
            assert draft.draft.evidence_ids
            assert draft.evidence_trace
            assert not reply_text.startswith(RAW_REPLY_PREFIX)
            assert all(marker not in reply_text for marker in RAW_REPLY_MARKERS)

        if draft.decision.reply_type == "holding_reply":
            assert draft.draft.claims == []
            assert draft.decision.can_send_to_customer is False

        assert all(guardrail.passed for guardrail in draft.guardrails)


def test_draft_evaluation_phase_gate_metrics() -> None:
    evaluation = get_draft_evaluation()

    assert evaluation.total_tickets == 70
    assert evaluation.generated_ticket_count == 70
    assert evaluation.customer_reply_count >= 40
    assert evaluation.holding_reply_count == 10
    assert evaluation.order_lookup_note_count == 10
    assert evaluation.guardrail_failures_count == 0
    assert evaluation.evidence_backed_customer_reply_count == evaluation.customer_reply_count


def test_draft_api_endpoints_and_review_flow() -> None:
    client = TestClient(create_app())

    evaluation = client.get("/api/drafts/evaluation")
    assert evaluation.status_code == 200
    assert evaluation.json()["generated_ticket_count"] == 70

    ticket = client.get("/api/drafts/tickets/TKT-1048")
    assert ticket.status_code == 200
    assert ticket.json()["decision"]["reply_type"] == "customer_reply"

    review = client.post(
        "/api/drafts/tickets/TKT-1048/review",
        json={"status": "approved", "reviewer_note": "Looks good."},
    )
    assert review.status_code == 200
    assert review.json()["approval"]["status"] == "approved"

    edited = client.post(
        "/api/drafts/tickets/TKT-1048/review",
        json={
            "status": "edited_and_approved",
            "reviewer_note": "Adjusted greeting.",
            "edited_reply": "Approved edited reply.",
        },
    )
    assert edited.status_code == 200
    assert edited.json()["approval"]["edited_reply"] == "Approved edited reply."

    missing = client.get("/api/drafts/tickets/TKT-DOES-NOT-EXIST")
    assert missing.status_code == 404
