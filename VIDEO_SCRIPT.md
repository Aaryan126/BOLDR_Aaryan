# BOLDR Revenue Rocket Video Script

Target runtime: 4:00 maximum. Record this as separate clips and stitch them together. It is fine if each clip has 1-2 seconds of extra lead-in/out for editing.

## Recording Prep

Before recording:

1. Start backend and frontend.
   ```bash
   cd backend
   env UV_CACHE_DIR=.uv-cache uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   ```bash
   cd frontend
   npm run dev -- --hostname 127.0.0.1 --port 3000
   ```
2. Open `http://127.0.0.1:3000`.
3. Set browser zoom to 90% or 100%.
4. In Customer Chat, click `Reset demo`.
5. Keep the app in dark mode.
6. Record at 1080p if possible.

## Clip 1: Opening Problem

Target length: 0:00-0:30.

Screen actions:

1. Start on `Customer Chat`.
2. Keep the empty chat state visible.
3. Make sure the top-right backend pill says `Backend connected`.
4. Do not type anything yet.

Narration:

"BOLDR is a small watch e-commerce brand with a support problem. Customers ask about straps, engraving, shipping, servicing, materials, sustainability, and order status. A small CS team can answer tickets, but the intelligence gets lost: repeated questions, missing FAQ updates, and product-page gaps. Revenue Rocket turns each enquiry into a support answer, a knowledge gap, or a marketing signal."

Rubric point: real SME problem.

Edit note: cut immediately after the phrase "marketing signal."

## Clip 2: Workflow And Source Proof

Target length: 0:30-1:05.

Screen actions:

1. Click `System Details`.
2. Pause on the summary area showing stable endpoints, dataset gaps, or system panels.
3. Scroll lightly if needed to show dataset/source, workflow, AI, or quality panels.
4. Do not spend time reading every metric. This clip is for architecture proof.

Narration:

"The workflow is evidence-first. It ingests the enquiry, classifies intent and one required buyer persona, searches the local BOLDR knowledge base, checks answerability, and only then drafts. It uses the actual six local dataset files, not invented files from the brief. Rate cards win for pricing and turnaround. Unsupported claims, order lookups, and uncertain facts are routed to humans instead of answered."

Rubric point: workflow logic and explainability.

Edit note: cut after "routed to humans instead of answered."

## Clip 3: Answerable Ticket Demo

Target length: 1:05-1:50.

Screen actions:

1. Click `Customer Chat`.
2. In the customer question box, paste:
   ```text
   Are BOLDR FKM straps BPA-free and safe for kids?
   ```
3. Click `Send`.
4. Wait for the trace to finish.
5. Briefly scroll inside the chat response if needed to show:
   - `Classifying buyer persona`
   - `Searching BOLDR knowledge base`
   - `Checking answerability`
   - `Drafting reply`
6. Click `Approvals`.
7. Show the draft reply and evidence area.
8. Optional but recommended: click `Approve`, then briefly return to `Customer Chat` to show the approved answer is released only after human approval.

Narration:

"Here is an answerable ticket. I am using a materials-safety question because it is common for watch straps. The system identifies the buyer as a health-conscious customer, retrieves product and FAQ evidence, shows the processing trace, and prepares a draft. Notice that it still does not send anything automatically. The draft waits in Approvals, where the BOLDR team can approve, edit, or reject it. This is a support copilot with human control, not an auto-send chatbot."

Rubric point: working end-to-end workflow plus safeguards.

Edit note: if the processing wait is long, cut the dead time between clicking `Send` and the completed trace.

## Clip 4: Knowledge Gap And FAQ Loop

Target length: 1:50-2:35.

Screen actions:

1. Click `Customer Chat`.
2. Paste this query:
   ```text
   Do you offer carbon-neutral shipping or a strap recycling take-back program?
   ```
3. Click `Send`.
4. Wait for the trace to finish.
5. Show that `Checking answerability` is blocked and the system routes to CS.
6. Click `CS Queue`.
7. In `Verified Resolution`, paste:
   ```text
   BOLDR is not currently claiming carbon-neutral shipping or a strap recycling take-back program. We use recyclable packaging where available and are assessing carrier offset and strap take-back options.
   ```
8. In `Resolution Note`, paste:
   ```text
   Confirmed as a policy gap for the demo.
   ```
9. Click `Resolve Gap`.
10. Click `Draft KB Entry`.
11. On the Knowledge Base view, show the generated KB draft.

Narration:

"Now a gap case. Carbon-neutral shipping, strap recycling, and similar sustainability claims are not fully supported by the current sources. The system blocks the answer instead of hallucinating, then creates a CS queue item with the missing knowledge, owner, priority, attempted evidence, and next action. After a human adds a verified resolution, Revenue Rocket drafts an FAQ entry. That KB draft still needs review before it becomes an approved knowledge-base addition."

Rubric point: no hallucination, human resolution, self-improving KB loop.

Edit note: cut waiting time after `Send`, `Resolve Gap`, and `Draft KB Entry`.

## Clip 5: Marketing Intel And Bonus Benchmark

Target length: 2:35-3:15.

Screen actions:

1. Click `Marketing Intel`.
2. Start at the top metrics: dataset themes, demo signals, live gaps, product-page gaps.
3. Scroll to `Monthly Brief`.
4. Scroll to `Weekly Theme Clustering`.
5. Scroll to `Bonus External Benchmark`.
6. Pause on the benchmark cards showing:
   - benchmarked themes
   - source groups
   - market-wide signals
   - source URLs
   - signal strength / validation steps

Narration:

"The same support data becomes business intelligence. Across 70 tickets, the system detects nine themes and six marketing opportunities. The monthly brief shows what customers ask that product pages should answer better, and weekly theme clustering groups repeated or novel questions by buyer need. The bonus benchmark compares internal themes against seven external source groups and twelve curated external mentions, then labels signal strength, source limitations, and validation steps. This is the key business loop: support tickets become FAQ updates, product-page improvements, campaign ideas, and market context."

Rubric point: marketing/product impact and bonus external sentiment.

Edit note: do not over-scroll. The goal is to show the three deliverables: monthly brief, weekly clustering, external benchmark.

## Clip 6: Metrics, Cost, And Proof

Target length: 3:15-3:45.

Screen actions:

1. Click `System Details`.
2. Scroll to the quality/evaluation scorecard if visible.
3. Pause on the top scorecard metrics showing:
   - `70` tickets evaluated
   - `6` passing metrics
   - `1` documented note
   - `6` golden fixtures
4. Then pause on the visible metric cards showing:
   - `96%` answerability accuracy
   - `100%` required persona coverage
   - `100%` evidence coverage for answerable tickets
   - unsupported hard-claim guardrails passing, if visible
5. Do not switch to the repo unless you need to show the written cost assumptions in `SUBMISSION.md`.

Narration:

"The evaluation scorecard covers 70 tickets, with six passing metrics, one documented note, and six golden fixtures. It shows about 96 percent answerability accuracy, 100 percent required persona coverage, and 100 percent evidence coverage for answerable tickets. The unsupported hard-claim guardrails also pass, which is important because the system should not invent product claims. In the submission notes, the local demo has zero incremental cost, and a small pilot is estimated at roughly 37 to 75 dollars per month before credits."

Rubric point: measurable impact, operating cost, quality proof.

Edit note: this clip can be shorter if you are over time.

## Clip 7: Model, Repo, And Reset Close

Target length: 3:42-4:00.

Screen actions:

1. Return to `Customer Chat`.
2. Show the `Backend connected` state and the workflow tabs.
3. Click `Reset demo`.
4. Show the empty chat state again.
5. Optionally show the repo file list with:
   - `SUBMISSION.md`
   - `VIDEO_SCRIPT.md`
   - `README.md`
   - `backend/`
   - `frontend/`

Narration:

"For the AI layer, this workflow is configured to use GLM-5.1 through FPT AI Factory. I chose GLM-5.1 because this product needs reasoning over structured evidence, not just generic chat. I developed the workflow with OpenCode, an open-source coding agent, and kept the system explainable: the model sits behind a replaceable adapter, tests pass without live credentials, and customer-facing answers still require retrieval evidence and human approval. In short, Revenue Rocket is not just a chatbot. It is a support intelligence workflow that answers what it can, blocks what it cannot, drafts KB updates, and turns repeated customer questions into product and marketing insight for BOLDR."

Rubric point: proof of execution and demo readiness.

Edit note: end on the empty Customer Chat screen. If you are over time, remove the repo file-list shot and keep the narration through "product and marketing insight for BOLDR."

## Stitching Checklist

Use this clip order:

1. Opening problem.
2. Workflow and source proof.
3. Answerable ticket demo.
4. Knowledge gap and FAQ loop.
5. Marketing Intel and external benchmark.
6. Metrics, cost, and proof.
7. Model, repo, and reset close.

Final runtime target: 3:50-4:00.

If the final cut is too long, trim in this order:

1. Waiting time after clicking `Send`.
2. Long scrolling in Marketing Intel.
3. Optional return to Customer Chat after approving the answer.
4. Repo file-list close.
