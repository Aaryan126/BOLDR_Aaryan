# Responsible AI: Failure Modes and Containment

BOLDR SignalDesk uses an approval-first safety design. The system drafts replies only when evidence is present, and it routes risky cases to human review.

## Failure Mode Matrix

| Failure mode | Detection | Containment | User-visible behavior | Escalation path |
|---|---|---|---|---|
| Retrieval miss | No strong evidence cards returned | Block send path; keep in review queue | "No local source produced strong evidence" in trace | CS review -> add verified resolution |
| Source conflict | Retrieval conflict warnings on same topic | Prefer authoritative priority sources | Conflict reflected in evidence/safety sections | CS lead decides final source truth |
| Schema-valid but wrong claim | Claim verification sentence check finds weak support | Soft-gate to `needs_review` when risk rises | Claim verification section highlights risk | Reviewer edits or rejects |
| Authoritative contradiction | Claim references non-authoritative evidence for hard facts | Soft-gate downgrade and contradiction guardrail | Contradiction tagged in claim verification | Reviewer rewrites from rate card/product reference |
| Stale source risk | Human-review intents on servicing/engraving edge cases | Avoid auto-send; require reviewer confirmation | Routing reason + required human input | CS confirms current policy/spec |
| Ambiguous query | Multiple intent hints detected | Keep approval gate and require clarification if needed | Safety/failure-mode tags shown | Reviewer asks clarifying question |
| Prompt-injection-like phrasing | Injection-like tokens in customer text | Ignore override language and keep source-grounded flow | Failure mode tag appears in trace | Reviewer validates response scope |

## Claim-level Verification Policy

- Each drafted customer reply is split into sentences.
- Factual sentences are checked against evidence links and authoritative-source expectations.
- Contradiction signals trigger a soft-gate downgrade to `needs_review`.
- Non-factual or procedural text is tracked but not hard-blocked.

## Human Review Ground Truth

Reviewers can now record:

- structured reason codes
- factual-correction flag
- edited final reply

These signals are surfaced in quality metrics and can be trended over time.

