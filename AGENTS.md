# BOLDR Revenue Rocket

This repository is for the BOLDR watch e-commerce challenge: build a customer intelligence workflow that helps a small CS team answer support enquiries, detect knowledge gaps, update the knowledge base, and turn recurring questions into marketing/product signals.

## Primary References

- Challenge brief: `Challenge Brief_BOLDR.pdf`
- Actual sample data directory: `Boldr Data/`
- Dataset guide: `docs/sample-dataset.md`
- Persona guide: `docs/personas.md`
- Product requirements document: `docs/prd.md`
- Implementation plan: `implementation_plan.md`

## Current Source-of-Truth Notes

- The challenge brief mentions 11 dataset files, but this repo currently has only 6 files under `Boldr Data/`. Use the actual files in `Boldr Data/` as the source of truth.
- Do not invent missing files from the brief. If the workflow needs data such as a gap log, decision tree, buyer persona table, or external sentiment table, create it as a generated output or project artifact.
- Use the five buyer personas from `docs/personas.md` exactly. The CSV contains different internal labels, so map them into the five required personas instead of exposing the CSV labels as final persona names.
- Treat rate card CSVs as authoritative for pricing, limits, and turnaround times. Use the SOP for routing, escalation, tone, and team process.
- Current implementation reaches Phase 9: local ingestion, deterministic classification, explainable retrieval evidence, structured AI provider contracts, evidence-gated reply drafting, stable workflow APIs, an interactive workbench UI, and a reviewable knowledge-gap/FAQ loop.
- Retrieval APIs live under `/api/retrieval/*`, AI config/status APIs live under `/api/ai/*`, draft review APIs live under `/api/drafts/*`, and workflow APIs live under `/api/tickets`, `/api/gaps`, and `/api/workflow/overview`. Gap metrics and KB draft review are under `/api/gaps/metrics` and `/api/gaps/{gap_id}/review-kb-entry`.
- Phase 5+ uses GLM-5.1 through FPT AI Factory. AI config lives in `.env.example`; tests must still pass without live AI credentials.
- Preserve human approval gates. The core system should draft replies and KB updates, not auto-send or auto-publish without review.

## Expected Core System Shape

The system should support the core challenge first:

1. Ingest customer enquiry.
2. Extract intent, context, and persona.
3. Search the knowledge base.
4. Draft an answer if supported by sources.
5. Flag unresolved questions without hallucinating.
6. Draft new KB entries after human resolution.
7. Cluster weekly themes.
8. Produce monthly marketing intelligence.

The bonus challenge should be planned as a later extension that benchmarks internal themes against external watch forums, Reddit communities, and competitor/customer reviews.

## Project Documentation Rules

- Update `docs/sample-dataset.md` when files are added, removed, renamed, or reinterpreted.
- Update `docs/personas.md` if persona mapping rules change, but keep the five required persona names exactly unless the user explicitly changes them.
- Update `docs/prd.md` after product, technical, UX, or workflow decisions are made.
- Update `implementation_plan.md` when implementation phases, test gates, or sequencing change.
- Keep `AGENTS.md` short and link out to detailed docs instead of duplicating long reference material here.
