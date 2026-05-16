from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.ingest.loaders import load_dataset, write_snapshot


def main() -> None:
    parser = argparse.ArgumentParser(description="Local dataset ingestion utilities.")
    parser.add_argument(
        "command",
        choices=["summary", "seed"],
        help="Print diagnostics or write the normalized dataset snapshot.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional output path for the seed command.",
    )
    args = parser.parse_args()

    snapshot = load_dataset()

    if args.command == "summary":
        print(json.dumps(snapshot.diagnostics.model_dump(), indent=2))
        return

    output_path = write_snapshot(snapshot, args.output)
    print(
        json.dumps(
            {
                "status": "ok",
                "output_path": str(output_path),
                "diagnostics": snapshot.diagnostics.model_dump(),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
