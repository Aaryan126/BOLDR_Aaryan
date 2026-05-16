import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.intelligence.ai_provider import FPTGLMProvider, FakeAIProvider, parse_fpt_chat_response
from app.intelligence.structured_outputs import (
    build_evidence_sufficiency_prompt,
    parse_structured_output,
    redact_text,
    schema_catalog,
)
from app.main import create_app
from app.models.ai import ChatMessage, EvidenceSufficiencyOutput
from app.services.classifications import get_ticket_classification
from app.services.retrieval import search_ticket_evidence


def test_schema_catalog_exposes_phase_5_contracts() -> None:
    schemas = schema_catalog()

    assert len(schemas) == 8
    assert {schema.name for schema in schemas} == {
        "intent_refinement",
        "persona_reasoning",
        "evidence_sufficiency",
        "draft_reply",
        "gap_record",
        "kb_draft",
        "theme_cluster",
        "marketing_brief",
    }
    assert all(schema.prompt_version == "phase5_glm_structured_v1" for schema in schemas)


def test_fake_provider_output_validates_against_schema() -> None:
    provider = FakeAIProvider(
        {
            "ticket_id": "TKT-1048",
            "sufficient_evidence": True,
            "confidence": 0.94,
            "supported_claims": ["The strap is BPA-free."],
            "unsupported_claims": [],
            "required_human_inputs": [],
            "rationale": "FAQ and product reference support the answer.",
        }
    )

    response = provider.chat([ChatMessage(role="user", content="Return JSON")])
    parsed = parse_structured_output(response.content, EvidenceSufficiencyOutput)

    assert parsed.ticket_id == "TKT-1048"
    assert parsed.sufficient_evidence is True
    assert parsed.confidence == 0.94


def test_malformed_structured_output_is_rejected() -> None:
    with pytest.raises(ValueError):
        parse_structured_output('{"ticket_id": "TKT-1048", "sufficient_evidence": true}', EvidenceSufficiencyOutput)


def test_redaction_removes_prompt_pii() -> None:
    text = (
        "Email aaryan@example.com about order BLD-12345 and tracking DHL9697354961. "
        "Call +65 9123 4567 if needed."
    )

    redacted = redact_text(text)

    assert "aaryan@example.com" not in redacted
    assert "BLD-12345" not in redacted
    assert "DHL9697354961" not in redacted
    assert "+65 9123 4567" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_ORDER_ID]" in redacted
    assert "[REDACTED_TRACKING_ID]" in redacted


def test_evidence_prompt_preview_uses_redacted_schema_payload() -> None:
    classification = get_ticket_classification("TKT-1048")
    retrieval = search_ticket_evidence("TKT-1048")
    assert classification is not None
    assert retrieval is not None

    preview = build_evidence_sufficiency_prompt(classification, retrieval)
    payload = json.loads(preview.messages[-1].content)

    assert preview.redacted is True
    assert preview.schema_name == "evidence_sufficiency"
    assert payload["prompt_version"] == "phase5_glm_structured_v1"
    assert payload["schema"]["title"] == "EvidenceSufficiencyOutput"
    assert payload["input"]["ticket"]["ticket_id"] == "TKT-1048"


def test_fpt_glm_provider_builds_payload_and_parses_wrapped_response() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers["Authorization"]
        captured["payload"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "code": 200,
                "message": "Chat completion successful",
                "data": {
                    "id": "chatcmpl-test",
                    "object": "chat.completion",
                    "created": 1750390044,
                    "model": "GLM-5.1",
                    "choices": [
                        {
                            "index": 0,
                            "message": {
                                "role": "assistant",
                                "content": "{\"ticket_id\":\"TKT-1048\",\"sufficient_evidence\":true,\"confidence\":0.9,\"supported_claims\":[],\"unsupported_claims\":[],\"required_human_inputs\":[],\"rationale\":\"ok\"}",
                            },
                            "finish_reason": "stop",
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 13,
                        "completion_tokens": 10,
                        "total_tokens": 23,
                    },
                    "provider": "openai",
                },
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = FPTGLMProvider(
        api_key="test-key",
        base_url="https://mkp-api.fptcloud.com/v1",
        client=client,
        max_retries=0,
    )

    result = provider.chat([ChatMessage(role="user", content="Return JSON")], stream=False)

    assert captured["url"] == "https://mkp-api.fptcloud.com/v1/chat/completions"
    assert captured["authorization"] == "Bearer test-key"
    assert captured["payload"]["model"] == "GLM-5.1"  # type: ignore[index]
    assert captured["payload"]["stream"] is False  # type: ignore[index]
    assert result.raw_response_id == "chatcmpl-test"
    assert result.usage is not None
    assert result.usage.total_tokens == 23
    assert parse_structured_output(result.content, EvidenceSufficiencyOutput).ticket_id == "TKT-1048"


def test_fpt_response_parser_accepts_plain_openai_shape() -> None:
    result = parse_fpt_chat_response(
        {
            "id": "plain",
            "model": "GLM-5.1",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "hello"},
                    "finish_reason": "stop",
                }
            ],
        }
    )

    assert result.content == "hello"
    assert result.raw_response_id == "plain"


def test_ai_api_status_schemas_and_prompt_preview() -> None:
    client = TestClient(create_app())

    status = client.get("/api/ai/status")
    assert status.status_code == 200
    assert status.json()["provider"] == "fpt_ai_factory"
    assert status.json()["model"] == "GLM-5.1"
    assert status.json()["structured_schema_count"] == 8

    schemas = client.get("/api/ai/schemas")
    assert schemas.status_code == 200
    assert len(schemas.json()) == 8

    preview = client.get("/api/ai/prompt-preview/TKT-1048")
    assert preview.status_code == 200
    assert preview.json()["schema_name"] == "evidence_sufficiency"

    missing = client.get("/api/ai/prompt-preview/TKT-DOES-NOT-EXIST")
    assert missing.status_code == 404
