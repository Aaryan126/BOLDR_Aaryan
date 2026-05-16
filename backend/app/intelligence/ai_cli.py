from __future__ import annotations

import argparse
import json

from app.intelligence.ai_provider import FakeAIProvider
from app.intelligence.structured_outputs import parse_structured_output
from app.models.ai import EvidenceSufficiencyOutput
from app.services.ai import (
    get_ai_schema_catalog,
    get_ai_status,
    get_evidence_prompt_preview,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Structured AI provider utilities.")
    parser.add_argument(
        "command",
        choices=["status", "schemas", "prompt-preview", "fake-evidence"],
        help="Inspect provider config, schemas, redacted prompts, or fake schema validation.",
    )
    parser.add_argument("--ticket-id", default="TKT-1048", help="Ticket ID for prompt commands.")
    args = parser.parse_args()

    if args.command == "status":
        print(get_ai_status().model_dump_json(indent=2))
        return

    if args.command == "schemas":
        print(json.dumps([schema.model_dump() for schema in get_ai_schema_catalog()], indent=2))
        return

    if args.command == "prompt-preview":
        preview = get_evidence_prompt_preview(args.ticket_id)
        if preview is None:
            raise SystemExit(f"Ticket not found: {args.ticket_id}")
        print(preview.model_dump_json(indent=2))
        return

    provider = FakeAIProvider(
        {
            "ticket_id": args.ticket_id,
            "sufficient_evidence": True,
            "confidence": 0.9,
            "supported_claims": ["Evidence supports a safe answer."],
            "unsupported_claims": [],
            "required_human_inputs": [],
            "rationale": "Fake provider output validates the Phase 5 schema contract.",
        }
    )
    response = provider.chat([])
    parsed = parse_structured_output(response.content, EvidenceSufficiencyOutput)
    print(parsed.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
