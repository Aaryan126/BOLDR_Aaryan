# BOLDR Revenue Rocket

Customer intelligence workbench for the BOLDR watch e-commerce challenge.

The current implementation includes Phases 1-11: repository scaffold, local dataset ingestion/diagnostics, deterministic ticket classification, explainable retrieval evidence, GLM-5.1/FPT AI Factory structured-output contracts, grounded reply drafting, stable workflow APIs, an interactive ticket review/gap-management workbench, a reviewable knowledge-gap/FAQ loop, theme radar, monthly marketing intelligence, and an evaluation quality scorecard. Bonus benchmarking begins in later phases.

## References

- Challenge brief: `Challenge Brief_BOLDR.pdf`
- Implementation plan: `implementation_plan.md`
- Product requirements: `docs/prd.md`
- Dataset guide: `docs/sample-dataset.md`
- Persona guide: `docs/personas.md`

## Prerequisites

- Python 3.13+
- uv
- Node.js and npm
- Docker, for Postgres/pgvector

## Environment

Create a local environment file when needed:

```bash
cp .env.example .env
```

GLM/FPT credentials are not required for local tests. Keep `AI_LIVE_ENABLED=false` unless you are intentionally smoke-testing live inference.

## Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Backend tests:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run pytest
```

Dataset diagnostics:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.ingest.cli summary
```

Write a generated normalized snapshot:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.ingest.cli seed
```

Classification evaluation:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.cli evaluate
```

Classify a single ticket:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.cli classify --ticket-id TKT-1048
```

Retrieval evaluation:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.retrieval_cli evaluate
```

Search the local knowledge base:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.retrieval_cli search --query "What is your return policy?"
```

Retrieve evidence for a ticket:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.retrieval_cli ticket --ticket-id TKT-1048
```

AI provider status:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.ai_cli status
```

Structured output schema catalog:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.ai_cli schemas
```

Redacted evidence-sufficiency prompt preview:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.ai_cli prompt-preview --ticket-id TKT-1048
```

Drafting evaluation:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.draft_cli evaluate
```

Generate a draft for one ticket:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run python -m app.intelligence.draft_cli ticket --ticket-id TKT-1048
```

Workflow API smoke examples:

```bash
curl http://127.0.0.1:8000/api/workflow/overview
curl "http://127.0.0.1:8000/api/tickets?reply_type=customer_reply&limit=5"
curl http://127.0.0.1:8000/api/tickets/TKT-1048/intelligence
curl -X POST http://127.0.0.1:8000/api/tickets/process-batch \
  -H "Content-Type: application/json" \
  -d '{"ticket_ids":["TKT-1048","TKT-1013"]}'
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Frontend checks:

```bash
cd frontend
npm run lint
npm run typecheck
```

## Database

Phase 1 includes Compose config for the planned Postgres/pgvector database.

```bash
docker compose up -d postgres
docker compose ps
```

Stop it with:

```bash
docker compose down
```

## Phase 1 Exit Criteria

- Backend starts locally and serves `/health` and `/api/meta`.
- Frontend starts locally and renders the workbench shell.
- Frontend shows backend health state.
- Postgres/pgvector Compose config validates and starts.
- README setup commands are accurate.

## Phase 2 Exit Criteria

- All six actual files under `Boldr Data/` parse successfully.
- Backend serves `/api/datasets/diagnostics`, `/api/datasets/sources`, and `/api/datasets/samples`.
- Frontend shows the local dataset diagnostics panel when the backend is running.
- Diagnostics warn that the brief mentions 11 files while 6 local files are available.
- Parser tests verify ticket, rate card, FAQ, SOP, product model, and strap catalogue counts.
- Backend and frontend checks pass.

## Phase 3 Exit Criteria

- Every ticket receives an intent, required persona, operational tags, and initial answerability state.
- Backend serves `/api/intelligence/classifications`, `/api/intelligence/classifications/{ticket_id}`, and `/api/intelligence/evaluation`.
- Frontend shows a deterministic classification summary when the backend is running.
- The final persona set uses only the five required personas from `docs/personas.md`.
- `transactional` remains an operational context, not a final buyer persona.
- Backend and frontend checks pass.

## Phase 4 Exit Criteria

- Every answerable ticket has at least one retrieved evidence source.
- Known unsupported themes such as carbon-neutral shipping, strap recycling, and MRI/magnetic resistance remain blocked.
- Backend serves `/api/retrieval/search`, `/api/retrieval/tickets/{ticket_id}`, and `/api/retrieval/evaluation`.
- Retrieval evaluation passes all golden questions and rate-card source-priority checks.
- Frontend shows the evidence coverage, unsupported-blocking, golden-query, and conflict-warning metrics.
- Backend and frontend checks pass.

## Phase 5 Exit Criteria

- GLM-5.1 via FPT AI Factory is configured behind a replaceable provider adapter.
- Backend serves `/api/ai/status`, `/api/ai/schemas`, and `/api/ai/prompt-preview/{ticket_id}`.
- `.env.example` documents `FPT_AI_API_KEY`, `FPT_AI_BASE_URL`, `GLM_MODEL`, and live-inference controls.
- Structured JSON schemas exist for intent refinement, persona reasoning, evidence sufficiency, draft replies, gap records, KB drafts, theme clusters, and marketing briefs.
- Tests validate fake-provider outputs, FPT response parsing, schema rejection, and prompt redaction without a live API key.
- Frontend shows GLM/FPT provider readiness and structured-contract count.

## Phase 6 Exit Criteria

- Answerable tickets produce evidence-backed customer drafts.
- Unsupported themes produce holding replies and gap records instead of unsupported claims.
- Order lookup tickets produce internal notes and do not invent delivery, refund, or cancellation status.
- Backend serves `/api/drafts`, `/api/drafts/evaluation`, `/api/drafts/tickets/{ticket_id}`, and `/api/drafts/tickets/{ticket_id}/review`.
- Frontend shows draft counts, holding replies, internal notes, and guardrail failure count.
- Backend and frontend checks pass.

## Phase 7 Exit Criteria

- Backend serves stable workflow endpoints for ticket lists, ticket intelligence, single-ticket processing, batch processing, gap lists/details, gap resolution, and KB draft generation.
- New workflow responses use consistent `{ status, data, meta }` envelopes where list/process metadata matters.
- Contract tests cover filters, full ticket traces, single/batch process runs, gap resolution, KB draft generation, and readable 404/409 errors.
- Frontend shows workflow API readiness, stable endpoint count, routable ticket count, gap count, review queue count, and unresolved gap count.
- Backend and frontend checks pass.

## Phase 8 Exit Criteria

- The first screen includes an interactive workbench, not only summary metrics.
- Inbox Intelligence supports ticket search, status filters, and batch processing.
- Ticket Review shows customer message, persona/routing tags, editable draft, approval/edit/reject controls, evidence cards, and guardrails.
- Knowledge Gaps shows a selectable gap queue, verified-resolution field, resolve action, FAQ draft action, and generated FAQ preview.
- Desktop and mobile browser smoke checks pass with no horizontal overflow.
- Backend and frontend checks pass.

## Phase 9 Exit Criteria

- Backend serves `/api/gaps/metrics` and `/api/gaps/{gap_id}/review-kb-entry`.
- Gap records include suggested FAQ section, product-page update flag, marketing signal, KB review note, and review timestamp.
- The workbench shows gap metrics and supports approve/reject actions for drafted FAQ entries.
- Human resolution remains required before FAQ generation, and human review remains required before publication.
- Backend and frontend checks pass.

## Phase 10 Exit Criteria

- Backend serves `/api/themes/radar`, `/api/marketing-briefs/current`, and `/api/marketing-briefs/generate`.
- Theme radar clusters all 70 tickets into the nine planned business themes with persona, answerability, evidence, trend, product-page gap, and marketing action fields.
- Monthly marketing brief answers what customers are asking that product pages should answer better, which themes need decisions, and which campaign angles are useful.
- Frontend shows Theme Radar cards, opportunity cards, and the generated Markdown brief.
- Backend and frontend checks pass.

## Phase 11 Exit Criteria

- Backend serves `/api/evaluation/scorecard`.
- Scorecard reports answerability accuracy, escalation routing accuracy, persona mapping coverage, evidence coverage, unsupported-claim guardrail results, source conflict handling, golden fixture pass rate, and actionable issues.
- Minimum targets are marked as pass or documented exception; the current CSV escalation-label disagreement is visible for human review.
- Frontend shows quality metric cards, golden fixture checks, and issue details suitable for demo defence.
- Backend and frontend checks pass.
