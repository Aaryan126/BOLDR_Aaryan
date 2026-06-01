from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.services.evaluation import get_quality_scorecard


def main() -> int:
    scorecard = get_quality_scorecard(get_settings().app_phase)
    metrics = {metric.metric_id: metric for metric in scorecard.metrics}

    failures: list[str] = []

    if metrics.get("unsupported_claim_guardrails") and metrics["unsupported_claim_guardrails"].value > 0:
        failures.append("unsupported_claim_guardrails must be 0")

    if metrics.get("golden_fixture_pass_rate") and metrics["golden_fixture_pass_rate"].value < 1.0:
        failures.append("golden_fixture_pass_rate must be 1.0")

    if metrics.get("evidence_coverage") and metrics["evidence_coverage"].value < 1.0:
        failures.append("evidence_coverage must be 1.0")

    if metrics.get("false_safe_rate") and metrics["false_safe_rate"].value > 0.01:
        failures.append("false_safe_rate must be <= 0.01")

    if failures:
        for failure in failures:
            print(f"QUALITY GATE FAILED: {failure}")
        return 1

    print("QUALITY GATE PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
