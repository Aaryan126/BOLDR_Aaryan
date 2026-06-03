# Problem Identification

BOLDR's support team has a real small-business problem: every customer question can be a support task, a knowledge-base gap, a product-page gap, or a marketing signal. Without a workflow, the team answers tickets one at a time, repeats research, misses FAQ updates, and loses buyer-language insights.

BOLDR SignalDesk focuses on the core challenge first. It uses the six actual local data files in `Boldr Data/`, maps every enquiry to the five required personas, and preserves human approval before any reply or FAQ update becomes customer-facing.

# Live Demo

- Frontend stable URL: https://frontend-ashy-mu-csvn2wfbmk.vercel.app
- Frontend latest deployment URL: https://frontend-r31246gum-aaryans-projects-4b4bf5a5.vercel.app
- Backend Cloud Run URL: https://boldr-signaldesk-backend-734024547221.us-central1.run.app

# Workflow Logic And Demonstration

The SignalDesk demo flow is:

1. Ingest a customer enquiry from the chat UI or a sample ticket.
2. Extract intent, operational context, and one of the five required personas.
3. Search BOLDR's FAQ, product reference, SOP, and rate cards with source priority.
4. Draft a customer reply only when evidence supports it.
5. Route unsupported or order-specific questions to CS without making unsupported claims.
6. Let CS generate two evidence-aware resolution options for a gap: an Attempted Answer and safer Customer Wording.
7. Let a human resolve the gap, then draft an FAQ entry for review.
8. Cluster weekly themes and generate a monthly marketing brief.

Verified system metrics:

| Metric | Current result |
|---|---:|
| Tickets processed | 70 |
| Draft/review records generated | 70 |
| Approval queue items | 26 |
| Knowledge-gap tickets blocked from hallucination | 9 |
| Themes detected | 9 |
| Marketing opportunities generated | 6 |
| External source groups benchmarked | 7 |
| External signal mentions curated | 12 |
| Unsupported hard-claim guardrail failures | 0 |
| Answerability accuracy | 95.71% |
| Evidence coverage for answerable tickets | 100% |

# Business Impact

The workflow gives a three-person CS team a repeatable operating loop:

- Faster responses because answerable tickets become evidence-backed drafts.
- Safer responses because unsupported claims are blocked and routed.
- Better knowledge management because verified human resolutions become draft FAQ entries.
- Better product pages because recurring customer wording is clustered into missing information themes.
- Better marketing decisions because the monthly brief ties buyer personas to product-page gaps and campaign angles.
- Stronger market context because the bonus benchmark cross-checks internal themes against Reddit, watch forums, review/community platforms, editorial sources, and independent review coverage.

# Cost Analysis

Assumptions are estimates for an SME pilot at 500 tickets per month. Exact provider costs should be replaced with live quotes before production procurement.

| Cost item | Assumption | Estimated monthly cost |
|---|---|---:|
| Local demo | Runs on developer machine; excludes machine cost | $0 incremental |
| Frontend hosting | Low-traffic Next.js app | $0-$20 |
| Small backend | Single small app service/container | $7-$15 |
| Managed Postgres/pgvector | Small managed database tier | $15-$25 |
| AI calls | 500 tickets/month at estimated $0.02 per processed ticket | $10 |
| Logs/storage/misc | Small pilot allowance | $5 |
| Sponsor credits | $50 FPT AI Factory + $50 Qwen as initial evaluation credits | -$100 initial credit |

Estimated steady-state SME cost: about $37-$75/month before credits.

Estimated first pilot month net cost: $0 while the $100 sponsor credits cover eligible AI usage and infrastructure is kept within free/low-cost tiers.

Estimated cost per resolved enquiry: about $0.09-$0.19 assuming 80% of 500 monthly tickets are resolved or routed with useful output.

# Safeguards And Human Checks

The system is approval-first:

- Customer replies are drafts until a human approves, edits, or rejects them.
- Unsupported claims become holding replies and CS gap records, not invented answers.
- CS resolution suggestions are customer-facing drafts only; internal routing language is rejected before suggestions are shown.
- Order status questions become internal lookup tasks, not static KB answers.
- FAQ additions require a verified human resolution before drafting.
- Draft FAQ entries require human approval before being treated as approved additions.
- Rate cards override lower-priority FAQ/SOP text for pricing, limits, and turnaround.
- External sentiment is labeled as curated directional evidence, with source limitations and validation steps shown before production use.
- Tests pass without live GLM/FPT credentials; live inference is an optional smoke path.

# Proof Of Execution

Repo proof:

- Backend: FastAPI services under `backend/app/`.
- Frontend: Next.js workbench under `frontend/`.
- Dataset documentation: `docs/sample-dataset.md`.
- Product requirements: `docs/prd.md`.
- Implementation sequence: `implementation_plan.md`.
- Non-technical workflow documentation with diagrams: `WORKFLOW_DOCUMENTATION.md`.
- Deployment notes: `deployment.md`.
- Demo script: `VIDEO_SCRIPT.md`.

Useful verification commands:

```bash
cd backend
env UV_CACHE_DIR=.uv-cache uv run pytest
```

```bash
cd frontend
npm run lint
npm run typecheck
```

Live deployment checks:

```bash
curl https://boldr-signaldesk-backend-734024547221.us-central1.run.app/health
curl https://boldr-signaldesk-backend-734024547221.us-central1.run.app/api/ai/status
curl https://boldr-signaldesk-backend-734024547221.us-central1.run.app/api/evaluation/scorecard
```

Demo reset options:

- UI: open https://frontend-ashy-mu-csvn2wfbmk.vercel.app and click `Reset demo` in Customer Chat.
- API: `curl -X POST https://boldr-signaldesk-backend-734024547221.us-central1.run.app/api/enquiries/reset`.
