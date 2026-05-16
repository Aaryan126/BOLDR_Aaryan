from __future__ import annotations

import argparse
import json

from app.services.classifications import (
    get_classification_evaluation,
    get_ticket_classification,
    list_ticket_classifications,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Deterministic ticket intelligence utilities.")
    parser.add_argument(
        "command",
        choices=["classify", "evaluate"],
        help="Print all classifications, one ticket classification, or the evaluation report.",
    )
    parser.add_argument("--ticket-id", help="Optional ticket ID for the classify command.")
    args = parser.parse_args()

    if args.command == "evaluate":
        print(json.dumps(get_classification_evaluation().model_dump(), indent=2))
        return

    if args.ticket_id:
        classification = get_ticket_classification(args.ticket_id)
        if classification is None:
            raise SystemExit(f"Ticket not found: {args.ticket_id}")
        print(classification.model_dump_json(indent=2))
        return

    print(
        json.dumps(
            [classification.model_dump() for classification in list_ticket_classifications()],
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
