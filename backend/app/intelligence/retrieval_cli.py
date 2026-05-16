from __future__ import annotations

import argparse
import json

from app.services.retrieval import (
    get_retrieval_evaluation,
    search_knowledge,
    search_ticket_evidence,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Knowledge retrieval and evidence utilities.")
    parser.add_argument(
        "command",
        choices=["search", "ticket", "evaluate"],
        help="Search the local KB, retrieve evidence for a ticket, or print evaluation metrics.",
    )
    parser.add_argument("--query", help="Question text for the search command.")
    parser.add_argument("--ticket-id", help="Ticket ID for the ticket command.")
    parser.add_argument("--limit", type=int, default=8, help="Maximum evidence cards to return.")
    args = parser.parse_args()

    if args.command == "evaluate":
        print(json.dumps(get_retrieval_evaluation().model_dump(), indent=2))
        return

    if args.command == "ticket":
        if not args.ticket_id:
            raise SystemExit("--ticket-id is required for the ticket command")
        result = search_ticket_evidence(args.ticket_id)
        if result is None:
            raise SystemExit(f"Ticket not found: {args.ticket_id}")
        print(result.model_dump_json(indent=2))
        return

    if not args.query:
        raise SystemExit("--query is required for the search command")
    print(search_knowledge(args.query, limit=args.limit).model_dump_json(indent=2))


if __name__ == "__main__":
    main()
