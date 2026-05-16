# BOLDR Revenue Rocket

Customer intelligence workbench for the BOLDR watch e-commerce challenge.

The current implementation includes Phases 1-3: repository scaffold, local dataset ingestion/diagnostics, and deterministic ticket classification. RAG, Qwen calls, draft replies, and bonus benchmarking begin in later phases.

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

Qwen credentials are not required for Phase 1.

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
