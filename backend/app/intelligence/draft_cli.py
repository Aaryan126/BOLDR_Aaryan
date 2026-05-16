from __future__ import annotations

import argparse
import json

from app.services.drafts import get_draft_evaluation, get_ticket_draft, list_ticket_drafts


def main() -> None:
    parser = argparse.ArgumentParser(description="Reply draft and answerability judge utilities.")
    parser.add_argument(
        "command",
        choices=["evaluate", "ticket", "all"],
        help="Print draft evaluation, one ticket draft, or all generated drafts.",
    )
    parser.add_argument("--ticket-id", help="Ticket ID for the ticket command.")
    args = parser.parse_args()

    if args.command == "evaluate":
        print(get_draft_evaluation().model_dump_json(indent=2))
        return

    if args.command == "ticket":
        if not args.ticket_id:
            raise SystemExit("--ticket-id is required for the ticket command")
        draft = get_ticket_draft(args.ticket_id)
        if draft is None:
            raise SystemExit(f"Ticket not found: {args.ticket_id}")
        print(draft.model_dump_json(indent=2))
        return

    print(json.dumps([draft.model_dump() for draft in list_ticket_drafts()], indent=2))


if __name__ == "__main__":
    main()
