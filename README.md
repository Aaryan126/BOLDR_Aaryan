# BOLDR Revenue Rocket

Customer intelligence workbench for the BOLDR watch e-commerce challenge.

The current implementation includes Phases 1-5: repository scaffold, local dataset ingestion/diagnostics, deterministic ticket classification, explainable retrieval evidence, and a GLM-5.1/FPT AI Factory structured-output layer. Draft replies and bonus benchmarking begin in later phases.

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
