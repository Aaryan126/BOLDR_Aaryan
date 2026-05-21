# BOLDR SignalDesk

BOLDR SignalDesk is an approval-first customer intelligence workflow for the BOLDR watch e-commerce challenge. It helps a small support team answer customer enquiries with source-backed drafts, block unsupported claims, create knowledge-gap records, draft FAQ updates, and turn repeated questions into marketing/product-page insight.

## What It Does

- Ingests customer enquiries from the demo chat UI or sample tickets.
- Classifies intent and maps each enquiry to the required buyer personas.
- Searches BOLDR's local FAQ, product reference, SOP, and rate-card sources.
- Drafts customer replies only when evidence supports the answer.
- Routes missing, risky, or order-specific questions to human review.
- Creates draft FAQ entries after a human adds a verified resolution.
- Clusters recurring themes and generates monthly marketing intelligence.
- Benchmarks internal themes against curated external watch-market signals.

## Judge Review Links

- [Submission summary](SUBMISSION.md)
- [Workflow documentation with diagrams](WORKFLOW_DOCUMENTATION.md)
- [Required 1-2 minute demo script](VIDEO_SCRIPT_1_2_MIN.md)
- [Long-form video recording script](VIDEO_SCRIPT.md)
- [Product requirements](docs/prd.md)
- [Dataset guide](docs/sample-dataset.md)
- [Implementation plan](implementation_plan.md)

## Tech Stack

- Backend: FastAPI, Python 3.13, uv
- Frontend: Next.js 15, React 19, TypeScript
- AI provider path: GLM-5.1 through FPT AI Factory
- Data mode: local challenge files in `Boldr Data/`

The local demo does not require a database. `docker-compose.yml` is included for the planned Postgres/pgvector path, but judges can run the current app with only the backend and frontend commands below.

## Prerequisites

Install:

- Python 3.13+
- uv
- Node.js and npm

## Environment Setup

Create the local environment file from the repo root:

```bash
cp .env.example .env
```

For normal judging and local testing, leave live AI disabled:

```bash
AI_LIVE_ENABLED=false
```

This is the safe default. The app and tests still run because the workflow has deterministic/offline paths and validated fake-provider tests.

To smoke-test live GLM-5.1 through FPT AI Factory, edit `.env`:

```bash
FPT_AI_API_KEY=your_fpt_ai_factory_key_here
FPT_AI_BASE_URL=https://mkp-api.fptcloud.com/v1
GLM_MODEL=GLM-5.1
AI_LIVE_ENABLED=true
```

Do not commit `.env`.

## Run Locally

Use two terminal windows.

Terminal 1: start the backend.

```bash
cd backend
uv sync
env UV_CACHE_DIR=.uv-cache uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Check the backend:

```bash
curl http://127.0.0.1:8000/health
```

Terminal 2: start the frontend.

```bash
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

The top-right app status should show that the backend is connected.

## Suggested Demo Path

Before each run, click `Reset demo` in Customer Chat.

1. Open `Customer Chat`.
2. Ask an answerable question:
   ```text
   Are BOLDR FKM straps BPA-free and safe for kids?
   ```
3. Open `Approvals` and review the draft plus evidence.
4. Ask a knowledge-gap question:
   ```text
   Do you offer carbon-neutral shipping or a strap recycling take-back program?
   ```
5. Open `CS Queue`, add a verified resolution, and draft a KB entry.
6. Open `Marketing Intel` to see theme clustering, monthly brief, and external benchmark.
7. Open `System Details` to see source proof and evaluation metrics.

Demo reset is also available through the API:

```bash
curl -X POST http://127.0.0.1:8000/api/enquiries/reset
```

## Verification Commands

Backend tests:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run pytest
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run typecheck
```

Optional backend smoke checks:

```bash
curl http://127.0.0.1:8000/api/workflow/overview
curl http://127.0.0.1:8000/api/evaluation/scorecard
curl http://127.0.0.1:8000/api/external/benchmarks
```

## Current Measured Results

- 70 tickets processed
- 44 customer drafts queued
- 10 knowledge-gap tickets blocked from hallucination
- 9 themes detected
- 6 marketing opportunities generated
- 7 external source groups benchmarked
- 12 curated external signal mentions
- 0 unsupported hard-claim guardrail failures
- About 96% answerability accuracy
- 100% evidence coverage for answerable tickets

## AI Credential Notes

Live GLM/FPT credentials are optional for review. If credentials are unavailable, describe the AI path honestly:

- The GLM-5.1/FPT provider adapter is implemented.
- The model is behind a replaceable provider interface.
- Tests use fake or validated structured outputs and do not require live credentials.
- When `AI_LIVE_ENABLED=true` and credentials are present, the workflow can use GLM-5.1 for structured, evidence-grounded drafting.

## Troubleshooting

If the frontend says the backend is unavailable, make sure the backend is running on port `8000`.

If you use a different backend port, pass the URL when starting the frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

If demo data looks stale, use `Reset demo`. This clears only in-memory demo enquiries; it does not modify the source dataset, docs, metrics, or marketing intelligence.

If you want to run the optional database container:

```bash
docker compose up -d postgres
docker compose down
```
