# Deployment

This project deploys as two public services:

- Backend: FastAPI on Google Cloud Run.
- Frontend: Next.js on Vercel.

Railway remains documented as a standby option, but the active deployment is Cloud Run because Railway project creation was blocked by a platform outage during setup.

The GLM/FPT key must only live on the backend as a private environment variable. Do not put it in `.env.example`, frontend files, Vercel `NEXT_PUBLIC_*` variables, or chat messages.

## Current Status

As of 2026-05-20, both services are deployed and publicly reachable:

```text
Frontend latest deployment URL: https://frontend-maxnme6gr-aaryans-projects-4b4bf5a5.vercel.app
Frontend stable alias URL: https://frontend-ashy-mu-csvn2wfbmk.vercel.app
Vercel scope/project: aaryans-projects-4b4bf5a5/frontend
Vercel project id: prj_3NbOBbM9aCGpWDR28npmmc0w9Ay8

Backend Cloud Run URL: https://boldr-signaldesk-backend-734024547221.us-central1.run.app
Backend Cloud Run service: boldr-signaldesk-backend
Backend Cloud Run revision: boldr-signaldesk-backend-00007-24q
```

The Vercel production environment variable is set:

```env
NEXT_PUBLIC_API_BASE_URL=https://boldr-signaldesk-backend-734024547221.us-central1.run.app
```

Verified checks:

```text
Frontend stable alias returns HTTP 200.
Frontend renders "Backend connected".
Cloud Run /health returns {"status":"ok"}.
Cloud Run /api/ai/status reports configured=true and live_enabled=true.
Cloud Run CORS allows the Vercel stable alias and latest deployment URL.
Public /api/enquiries creates an awaiting_approval draft with evidence and guardrails.
```

Vercel SSO deployment protection was disabled for this project so the public `*.vercel.app` URLs return `200` instead of `401`.

Command used:

```bash
npx --yes vercel project protection disable frontend --sso
```

Backend tests pass locally:

```text
backend pytest: 69 passed
```

The backend repo is also prepared for Railway deployment, the Railway CLI login succeeded, and backend tests pass locally. Railway project creation was attempted with:

```bash
railway init --name boldr-signaldesk
```

Railway returned:

```text
Deploys have been paused due to a platform outage. Please see status.railway.com
```

Latest recheck:

```text
2026-05-20: Railway CLI account/list calls succeeded, but retrying
railway init --name boldr-signaldesk still returned:
Deploys have been paused due to a platform outage. Please see status.railway.com
```

Resume from the Railway `init` step below only if switching away from Cloud Run later.

### Google Cloud Backend Project

The active Cloud Run backend uses this existing billing-enabled Google Cloud project:

```text
PROJECT_ID=project-41520fb3-0168-470f-a25
Project name: My First Project
Billing account: 01232B-BC6741-9091CB
Billing enabled: true
REGION=us-central1
SERVICE=boldr-signaldesk-backend
REPO=boldr-signaldesk
```

A new project was created for this app:

```text
PROJECT_ID=boldr-signaldesk-ak276
Project name: BOLDR SignalDesk
```

However, linking billing to that new project failed because the billing account hit its project-link quota:

```text
Cloud billing quota exceeded
```

Use `project-41520fb3-0168-470f-a25` unless billing quota is increased or an existing project is unlinked from the billing account.

Cloud Run production settings:

```text
min instances: 1
max instances: 1
cpu: 1
memory: 1Gi
concurrency: 20
unauthenticated access: allowed
secret: FPT_AI_API_KEY is mounted from Secret Manager secret fpt-ai-api-key:latest
artifact image: us-central1-docker.pkg.dev/project-41520fb3-0168-470f-a25/boldr-signaldesk/boldr-signaldesk-backend:latest
```

Cloud Run environment:

```env
APP_ENV=production
AI_PROVIDER=fpt_ai_factory
FPT_AI_BASE_URL=https://mkp-api.fptcloud.com/v1
GLM_MODEL=GLM-5.1
GLM_THINKING_ENABLED=false
AI_TIMEOUT_SECONDS=8
AI_MAX_RETRIES=0
AI_LIVE_ENABLED=true
AI_DETERMINISTIC_FALLBACK_ENABLED=true
PUBLIC_ENQUIRY_RATE_LIMIT=30
PUBLIC_ENQUIRY_RATE_WINDOW_SECONDS=60
CORS_ORIGINS=https://frontend-maxnme6gr-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-ashy-mu-csvn2wfbmk.vercel.app,https://frontend-3ayl1gnv0-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-ksu5tl0io-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-d4x93694s-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-jidepyk7z-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-acdaa9zi1-aaryans-projects-4b4bf5a5.vercel.app
```

The short timeout and fallback setting are deliberate for public judging: the backend still calls private GLM/FPT first, but if GLM is slow or returns invalid structured JSON, the app uses the existing deterministic evidence-grounded draft and keeps the human approval gate.

Cloud Run CLI flow used:

```bash
gcloud config set project project-41520fb3-0168-470f-a25
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create boldr-signaldesk --repository-format=docker --location=us-central1 --description="BOLDR SignalDesk containers"
gcloud secrets create fpt-ai-api-key --replication-policy=automatic
gcloud secrets versions add fpt-ai-api-key --data-file=-
gcloud secrets add-iam-policy-binding fpt-ai-api-key --member=serviceAccount:734024547221-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor
gcloud builds submit --tag us-central1-docker.pkg.dev/project-41520fb3-0168-470f-a25/boldr-signaldesk/boldr-signaldesk-backend:latest .
gcloud run deploy boldr-signaldesk-backend --image us-central1-docker.pkg.dev/project-41520fb3-0168-470f-a25/boldr-signaldesk/boldr-signaldesk-backend:latest --region us-central1 --allow-unauthenticated --min-instances 1 --max-instances 1 --cpu 1 --memory 1Gi --concurrency 20 --set-secrets FPT_AI_API_KEY=fpt-ai-api-key:latest
```

The secret creation command above expects the real key via stdin. Do not paste the key into this file.

## Backend: Railway

Railway should deploy the repo root, not only the `backend/` folder. The backend loader expects the challenge source files in `Boldr Data/`, so the root Dockerfile copies both `backend/` and `Boldr Data/` into the container.

Files used by Railway:

- `Dockerfile`: builds the FastAPI backend with Python 3.13 and `uv`.
- `.dockerignore`: keeps local caches, frontend build output, and secrets out of the Docker build context.
- `railway.json`: tells Railway to use the Dockerfile and check `/health`.

### Railway Service Settings

Use one backend service, for example:

```text
Project: boldr-signaldesk
Service: boldr-signaldesk-backend
Root deployed by CLI: repository root
Health check path: /health
Serverless/App Sleeping: off for judging demos
```

The service start command is defined by the Dockerfile:

```bash
uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Railway supplies `PORT` automatically.

### Backend Environment Variables

Set these on the Railway backend service:

```env
APP_ENV=production
AI_PROVIDER=fpt_ai_factory
FPT_AI_BASE_URL=https://mkp-api.fptcloud.com/v1
GLM_MODEL=GLM-5.1
GLM_THINKING_ENABLED=false
AI_TIMEOUT_SECONDS=8
AI_MAX_RETRIES=0
AI_LIVE_ENABLED=true
AI_DETERMINISTIC_FALLBACK_ENABLED=true
PUBLIC_ENQUIRY_RATE_LIMIT=30
PUBLIC_ENQUIRY_RATE_WINDOW_SECONDS=60
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Set this one privately in Railway only:

```env
FPT_AI_API_KEY=your_real_fpt_ai_factory_key
```

Do not expose the API key through any frontend variable. Only the backend calls GLM/FPT.

### CLI Flow

Authenticate:

```bash
railway login --browserless
```

Create or link the project:

```bash
railway init --name boldr-signaldesk
railway add --service boldr-signaldesk-backend
```

Set non-secret variables:

```bash
railway variable set --service boldr-signaldesk-backend APP_ENV=production
railway variable set --service boldr-signaldesk-backend AI_PROVIDER=fpt_ai_factory
railway variable set --service boldr-signaldesk-backend FPT_AI_BASE_URL=https://mkp-api.fptcloud.com/v1
railway variable set --service boldr-signaldesk-backend GLM_MODEL=GLM-5.1
railway variable set --service boldr-signaldesk-backend GLM_THINKING_ENABLED=false
railway variable set --service boldr-signaldesk-backend AI_TIMEOUT_SECONDS=8
railway variable set --service boldr-signaldesk-backend AI_MAX_RETRIES=0
railway variable set --service boldr-signaldesk-backend AI_LIVE_ENABLED=true
railway variable set --service boldr-signaldesk-backend AI_DETERMINISTIC_FALLBACK_ENABLED=true
railway variable set --service boldr-signaldesk-backend PUBLIC_ENQUIRY_RATE_LIMIT=30
railway variable set --service boldr-signaldesk-backend PUBLIC_ENQUIRY_RATE_WINDOW_SECONDS=60
railway variable set --service boldr-signaldesk-backend CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Set the FPT/GLM key through the Railway dashboard, or with an interactive stdin command:

```bash
railway variable set --service boldr-signaldesk-backend FPT_AI_API_KEY --stdin
```

Deploy:

```bash
railway up --service boldr-signaldesk-backend
```

Generate a Railway domain:

```bash
railway domain --service boldr-signaldesk-backend --port 8000
```

Smoke-test after deployment:

```bash
curl https://your-railway-backend.up.railway.app/health
curl https://your-railway-backend.up.railway.app/api/meta
curl https://your-railway-backend.up.railway.app/api/ai/status
```

## Frontend: Vercel

Deploy the frontend from the `frontend/` directory.

Recommended Vercel settings:

```text
Framework preset: Next.js
Root directory: frontend
Build command: npm run build
Install command: npm install
Output directory: .next
```

Set this Vercel environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://boldr-signaldesk-backend-734024547221.us-central1.run.app
```

Only the backend URL should be public. Do not add `FPT_AI_API_KEY` or any GLM credential to Vercel.

CLI option if the backend URL changes:

```bash
cd frontend
npx --yes vercel env add NEXT_PUBLIC_API_BASE_URL production
npx --yes vercel --prod --yes
```

If using Railway instead of Cloud Run, update the Railway backend variable:

```env
CORS_ORIGINS=https://frontend-acdaa9zi1-aaryans-projects-4b4bf5a5.vercel.app,https://frontend-ashy-mu-csvn2wfbmk.vercel.app
```

For the active Cloud Run backend, update the same CORS value with:

```bash
gcloud run services update boldr-signaldesk-backend --region us-central1 --update-env-vars '^@^CORS_ORIGINS=https://your-vercel-deployment.vercel.app,https://your-stable-alias.vercel.app'
```

If using a custom frontend domain, include both domains separated by commas:

```env
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

Redeploy or restart the backend service after changing CORS.

## Judging Demo Checklist

Before sharing the public link:

- Cloud Run backend is deployed and `/health` returns `ok`.
- Cloud Run `min-instances=1` is set so the demo does not wait for scale-from-zero.
- `FPT_AI_API_KEY` is set only in Google Secret Manager and mounted into Cloud Run.
- `AI_LIVE_ENABLED=true` only after the private key is set.
- Vercel frontend has `NEXT_PUBLIC_API_BASE_URL` pointing to Cloud Run.
- Cloud Run `CORS_ORIGINS` includes the deployed Vercel URL and stable alias.
- `/api/ai/status` reports the expected provider configuration.
- Customer Chat can submit a question and create a reviewable draft.

## Cost Controls

Cloud Run is using `min-instances=1` for judging responsiveness, so it consumes some Google Cloud credit while the demo is live. This is intended during judging and can be set back to zero afterward.

On Railway Trial, the included $5 is a one-time credit. Keeping Serverless/App Sleeping off makes the backend responsive, but it consumes credit continuously.

Recommended safeguards:

- Set Google Cloud budget alerts for the active project.
- Keep only one backend replica running for the demo.
- Add application-level rate limiting before widely sharing the link.
- After judging, update Cloud Run to `--min-instances 0` or delete the service if it is no longer needed.
- Rotate the FPT/GLM key after judging if the public link is shared broadly.
