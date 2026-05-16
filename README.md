# BOLDR Revenue Rocket

Customer intelligence workbench for the BOLDR watch e-commerce challenge.

The current implementation is Phase 1: repository and app scaffold. It creates a runnable FastAPI backend, a Next.js dashboard shell, local environment examples, and PostgreSQL/pgvector Compose configuration. Ingestion, RAG, Qwen calls, ticket processing, and bonus benchmarking begin in later phases.

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
uv run pytest
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
- Backend and frontend checks pass.
