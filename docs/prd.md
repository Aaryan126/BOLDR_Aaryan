# BOLDR SignalDesk PRD

Version: 0.1  
Date: 2026-05-16  
Primary objective: Build a self-improving customer intelligence engine for BOLDR's watch e-commerce support workflow.

## 1. Executive Summary

BOLDR SignalDesk is a full-stack AI workflow and demo product for a Singapore-based watch micro-brand. The system turns customer enquiries into three kinds of output:

1. Human-approved support replies grounded in BOLDR's knowledge base.
2. Knowledge gap records and draft FAQ updates when the answer is missing or uncertain.
3. Weekly and monthly product/marketing intelligence that reveals what buyers care about.

The core challenge must be solved first using the six local dataset files currently available in `Boldr Data/`. The bonus challenge should be designed as an ambitious extension that benchmarks internal ticket themes against external watch communities, Reddit discussions, forum threads, competitor reviews, and resale/marketplace signals.

This is not a chatbot. It is an approval-first intelligence workbench for a 3-person customer service team.

## 2. User Decisions And Constraints

- Build an end-to-end system: web app, backend workflow, AI pipeline, local dataset demo, and bonus-ready architecture.
- Preferred stack direction:
  - Python/FastAPI for backend.
  - Next.js/React for frontend.
  - LlamaIndex and/or LangChain-family tooling for AI orchestration.
  - Database chosen for fit, not ideology.
- AI model provider:
  - Use GLM-5.1 via FPT AI Factory for inference.
  - Prefer open-source/local infrastructure around the model layer where practical.
  - Keep the provider adapter replaceable.
- First version:
  - Use local dataset files only.
  - Simulate Gmail and Shopify using local ticket/order context.
  - Plan real Gmail and Shopify integrations as later phases if they help the challenge story.
- Quality bar:
  - Strong demo UI.
  - Robust backend logic.
  - Explainable architecture.
  - High-quality marketing/product insight.
  - Ambitious and meaningful for real companies, not only a hackathon toy.

## 3. Problem Statement

BOLDR's CS team manually reads customer emails, searches internal documents, drafts replies, escalates unknown questions, and sometimes updates the FAQ later. The current workflow loses intelligence:

- Repeated questions are handled one by one.
- New questions are not reliably logged.
- FAQ updates depend on memory and manual follow-through.
- Marketing and product teams do not get systematic signals from support.
- Buyer personas are not tagged consistently.
- Product page gaps are discovered accidentally.

The system must create a repeatable intelligence loop:

1. Enquiry arrives.
2. Intent and persona are detected.
3. Knowledge base is searched.
4. Supported answer is drafted for human approval.
5. Unsupported answer is flagged without hallucination.
6. Human resolution creates a draft KB entry.
7. New questions are clustered into themes.
8. Themes become marketing and product recommendations.

## 4. Goals

### 4.1 Core Challenge Goals

- Process every ticket from `Boldr Data/01_customer_tickets.csv`.
- Search all available local knowledge sources.
- Decide whether a ticket is answerable from the KB.
- Draft customer replies only when evidence is sufficient.
- Flag knowledge gaps and order-specific tasks without making unsupported claims.
- Draft KB entries in the same style as the FAQ after human resolution.
- Cluster novel and recurring questions weekly.
- Generate a monthly marketing brief: "What customers are asking that is not on your product pages."
- Tag each enquiry with one of the five required buyer personas from `docs/personas.md`.

### 4.2 Bonus Challenge Goals

- Identify at least two external sources relevant to BOLDR's buyers.
- Compare internal ticket themes against external sentiment on at least three themes.
- For each theme, answer:
  - Is this BOLDR-specific or market-wide?
  - What should BOLDR do about it?
- Prefer a real source architecture that can ingest Reddit/forum/review data later, even if the first demo uses a curated or cached sample for reliability.

### 4.3 Business Goals

- Reduce manual support research time.
- Improve reply consistency and factual accuracy.
- Build a defensible knowledge update loop.
- Surface product page gaps from actual customer language.
- Reveal emerging buyer motivations before they become obvious.
- Give a small CS team a tool they could realistically own.

### 4.4 Current Demo Experience

- The primary UI is a chat-first support intelligence workspace, not a guided loop.
- Judges can type any customer question or run a real sample enquiry from the local ticket dataset.
- Every ad-hoc enquiry shows a visible processing trace: reading, persona classification, knowledge search, evidence review, answerability check, and draft-or-route decision.
- Answerable questions create a draft that waits in Approvals until a human approves, edits, or rejects it.
- Unsupported questions create CS Queue items with missing knowledge, owner, priority, evidence attempted, and next action.
- CS Queue can generate two grounded resolution suggestions from the customer question, attempted evidence, missing knowledge, and owner: an attempted answer based on attempted evidence, and a customer-wording fallback for the "we are checking / not confirmed yet" response. When live AI is enabled, this uses GLM through the configured provider with structured output validation; offline and test runs use deterministic customer-safe fallback wording. The agent can insert one into Verified Resolution, edit it, then resolve the gap before drafting a reusable KB entry or closing the one-off case without KB work.
- KB drafts require approve/reject review before they appear as approved additions.
- Knowledge Base includes a clickable source-map visualization showing source files, covered support topics, and outputs such as evidence-backed replies, CS gap routing, draft KB updates, and approved additions.
- Marketing Intel combines existing theme radar data with live demo enquiry signals and explicitly maps those signals to the five required personas.
- Marketing Intel now presents the two brief deliverables as explicit first-class sections: Weekly Theme Clustering and the monthly "What customers are asking that is not on your product pages" brief.
- Marketing Intel also surfaces the bonus External Sentiment Benchmarking output with a visible shortcut, source-group counts, market-wide signal count, benchmark cards, signal strength, source diversity, rationale, validation steps, and source links so judges do not need to open System Details.
- The prior implementation workbench, quality dashboard, external benchmarking, diagnostics, and status panels remain available under System Details.
- Customer Chat includes a Reset demo action that clears only in-memory ad-hoc enquiries, approval selections, CS queue selections, and draft demo state. It does not modify the source dataset, generated theme radar, marketing intelligence, or project documentation.

## 5. Non-Goals

- Do not auto-send customer emails in the first version.
- Do not auto-publish FAQ entries without human approval.
- Do not replace Shopify for order status.
- Do not claim product facts that are not in the KB or human-approved resolution.
- Do not build a generic chatbot as the main interface.
- Do not depend on missing files from the challenge brief.

## 6. Source Dataset And Knowledge Base

Use `docs/sample-dataset.md` as the detailed dataset guide.

Actual files available:

| File | Role |
|---|---|
| `Boldr Data/01_customer_tickets.csv` | Primary sample inbox and evaluation set |
| `Boldr Data/03a_rate_card_engraving.csv` | Authoritative engraving prices, limits, scripts, and timing |
| `Boldr Data/03b_rate_card_servicing.csv` | Authoritative servicing prices, inclusions, and turnaround |
| `Boldr Data/04_faq_document.pdf` | Current customer-facing FAQ and reply/FAQ style source |
| `Boldr Data/05a_SOP.docx` | Internal workflow, escalation, tone, and routing source |
| `Boldr Data/05b_product_reference.docx` | Authoritative product specs, SKUs, straps, safety, and availability |

### 6.1 Source Priority

When sources conflict:

1. Rate card CSVs for prices, character limits, service scope, and turnaround.
2. Product reference for specs, SKUs, materials, safety, strap compatibility, and availability.
3. FAQ for customer-facing wording and existing coverage.
4. SOP for process, escalation, human approval, contacts, and tone.
5. Ticket labels for evaluation and examples only.

### 6.2 Known Dataset Caveats

- The brief says 11 files exist, but only 6 are present.
- The brief says five personas, while the ticket CSV has seven internal labels.
- Some historical `knowledge_gap` tickets are now answerable from the current FAQ or rate cards.
- Order-status tickets require Shopify/order-system lookup and should not be treated as static KB answers.
- The SOP contains some older pricing/turnaround values that conflict with rate cards.

The product should expose these caveats as evidence of rigorous source handling, not hide them.

## 7. Required Personas

Use the five personas from `docs/personas.md` exactly:

1. Health-Conscious Buyer
2. Gifter
3. Enthusiast / Collector
4. Active / Outdoor Buyer
5. Sustainability Advocate

The ticket CSV labels are internal training/evaluation hints only. Final product outputs must use the five required persona names.

## 8. Primary Users

### 8.1 CS Agent

Needs to triage and answer tickets faster without losing control.

Key needs:

- See intent, persona, confidence, and source evidence.
- Edit/approve draft replies.
- Escalate gaps cleanly.
- Avoid unsupported claims.

### 8.2 CS Team Lead

Needs to manage unresolved gaps and ensure the KB improves.

Key needs:

- Gap queue.
- Source conflict warnings.
- Weekly theme clusters.
- FAQ draft approval.
- Escalation visibility.

### 8.3 Marketing/Product Owner

Needs to turn support signals into positioning and product page improvements.

Key needs:

- Monthly marketing brief.
- Buyer persona distribution.
- Themes missing from product pages.
- Suggested product badges, FAQ additions, and campaign angles.
- Bonus: external sentiment comparison.

## 9. Product Experience

### 9.1 Main Navigation

The web app should have five core views:

1. Inbox Intelligence
2. Ticket Review
3. Knowledge Gaps
4. Theme Radar
5. Marketing Brief

Bonus phase adds:

6. External Benchmarking

### 9.2 Inbox Intelligence

Purpose: batch-process local tickets and show triage results.

Required elements:

- Ticket list with status, channel, question type, persona, answerability, and escalation state.
- Filters for answerable, gap, order-specific, theme, persona, and channel.
- Summary counters:
  - total tickets
  - answerable from KB
  - knowledge gaps
  - order/system lookup required
  - escalation required
  - top themes
  - top personas
- "Run intelligence pass" action for demo.

### 9.3 Ticket Review

Purpose: show the full reasoning trace for a single ticket.

Required elements:

- Customer message.
- Extracted intent and subquestions.
- Required persona.
- Operational tags such as `order_lookup_required` or `knowledge_gap`.
- Retrieved evidence cards:
  - source file
  - source type
  - relevant excerpt
  - source priority
  - confidence
- Source conflict warnings.
- Draft customer reply if answerable.
- Holding reply if not answerable.
- Internal escalation note.
- Approve/edit/reject controls.

### 9.4 Knowledge Gaps

Purpose: manage the self-improving KB loop.

Required elements:

- Gap list with theme, persona, frequency, source reason, and status.
- Suggested owner:
  - CS Team Lead
  - Service Centre
  - Corporate Sales
  - Marketing
  - Operations
  - Supplier/manufacturer
- Missing facts checklist.
- Human resolution field.
- Auto-generated FAQ draft after resolution.
- "Approve KB entry" action.

Gap statuses:

- `new`
- `needs_human_answer`
- `awaiting_supplier`
- `resolved_needs_kb_draft`
- `kb_draft_ready`
- `approved`
- `rejected`

### 9.5 Theme Radar

Purpose: show weekly clustering and trend detection.

Required elements:

- Theme clusters by week/month.
- Representative customer questions.
- Answerability rate per theme.
- Persona mix per theme.
- Emerging signal flag.
- Product page gap flag.
- KB gap flag.
- Recommended action.

Recommended core themes:

- Materials and Safety
- Engraving and Personalisation
- Strap Compatibility
- Watch Servicing and Aftercare
- Orders, Shipping, and Returns
- Active and Outdoor Use
- Sustainability and Ethics
- Collector and Technical Specs
- Corporate and Gifting

### 9.6 Marketing Brief

Purpose: produce the monthly business output required by the brief.

Required sections:

- Executive summary.
- Top customer questions not well covered on product pages.
- Persona-specific insights.
- Product page updates.
- FAQ updates.
- Campaign opportunities.
- Evidence table with ticket IDs and snippets.
- Confidence and data limitations.

Example opportunity outputs:

- Add "BPA-Free Straps" badge for FKM rubber and NATO straps.
- Add nickel/hypoallergenic material table to product pages.
- Add a strap compatibility selector by model.
- Add gifting module: engraving, gift wrap, rush processing, corporate order CTA.
- Add sustainability roadmap FAQ for vegan straps, recycling, packaging, and carbon-neutral shipping.
- Add outdoor-use clarity: swimming vs diving, shock resistance, altitude, strap recommendations.

## 10. Functional Requirements

### 10.1 Data Ingestion

The system must ingest:

- CSV tickets.
- CSV rate cards.
- PDF FAQ.
- DOCX SOP.
- DOCX product reference.

It must normalize all sources into:

- raw document records
- structured records where available
- text chunks for retrieval
- metadata:
  - file name
  - section
  - source type
  - source priority
  - last updated if available

### 10.2 Ticket Processing

For each ticket:

- Extract customer question(s).
- Detect channel and status.
- Identify whether an order ID or tracking ID appears in the body.
- Classify intent.
- Tag one required persona.
- Detect operational routing tags.
- Search KB.
- Decide answerability.
- Generate output object.

Required output schema:

```json
{
  "ticket_id": "TKT-1048",
  "intent": "materials_safety",
  "persona": "Health-Conscious Buyer",
  "operational_tags": ["safety", "minor_gift_context"],
  "answerability": "answerable",
  "confidence": 0.92,
  "requires_escalation": false,
  "evidence": [],
  "draft_reply": "",
  "gap_record": null,
  "marketing_signals": []
}
```

### 10.3 Retrieval And Evidence

Retrieval must combine:

- vector search over FAQ/SOP/product chunks
- keyword/BM25 search for exact terms
- structured table lookup for rate cards and products
- source priority ranking
- conflict detection

The answer generator must cite the sources it used internally. UI evidence cards should show the file/section and supporting text.

### 10.4 Answerability Decision

The system should mark a ticket answerable only when:

- retrieved evidence directly supports the requested facts
- there is no unresolved source conflict on the relevant facts
- the question does not require live Shopify/order lookup
- no missing certification, supplier, legal, or medical claim is required

Answerability states:

- `answerable`
- `partially_answerable`
- `knowledge_gap`
- `order_lookup_required`
- `needs_human_review`

Rules:

- `answerable`: generate a full draft reply.
- `partially_answerable`: answer supported parts and list missing facts internally.
- `knowledge_gap`: do not answer the unsupported claim; create gap record and holding reply.
- `order_lookup_required`: create operational task, not KB answer.
- `needs_human_review`: create escalation note.

### 10.5 Reply Drafting

Draft replies must follow BOLDR tone:

- friendly but premium
- direct
- helpful
- no filler
- no unsupported promises
- no "Great question!" as a default opener
- no "Dear Sir/Madam"

Drafts must:

- answer the customer directly
- include relevant caveats
- ask for required information when needed
- route correctly when needed
- avoid internal jargon

### 10.6 Escalation And Gap Handling

Escalate when:

- the answer is not in the KB
- an order/system lookup is required
- a customer is angry or threatens chargeback
- warranty claim involves significant damage or defect
- refund outstanding over 10 business days
- corporate/bulk order enquiry comes in
- media/press/influencer enquiry comes in
- certification/supplier confirmation is required

Gap record fields:

- date
- source ticket IDs
- paraphrased question
- raw customer wording
- theme
- required persona
- current answerability reason
- missing fact
- suggested owner
- marketing signal flag
- recommended action
- status

### 10.7 KB Entry Drafting

After a human enters a verified answer, the system must draft a FAQ entry in BOLDR style:

```text
Q: [Customer-facing question]
A: [Concise verified answer with caveats where needed.]
```

The draft should include:

- suggested FAQ section
- source ticket IDs
- internal notes
- confidence
- marketing tags
- whether product page should also be updated

### 10.8 Theme Clustering

Weekly theme clustering should group:

- repeated answerable questions
- novel knowledge gaps
- operational friction
- emerging persona signals

The clusterer should produce:

- theme name
- frequency
- trend direction
- representative ticket IDs
- common customer wording
- answerability breakdown
- persona breakdown
- recommended KB action
- recommended marketing action

### 10.9 Monthly Marketing Brief

The marketing brief must answer:

- What are customers asking that is not prominent on product pages?
- Which personas are asking?
- Which themes are rising?
- Which questions are answerable but still indicate product page gaps?
- Which questions are unanswerable and require product/ops decisions?
- Which claims could become product badges or campaign angles?

Output format:

- Markdown report in app.
- Exportable JSON.
- Optional PDF later.

### 10.10 Evaluation

Use the sample ticket labels as a first-pass evaluation set.

Metrics:

- answerability classification accuracy
- escalation classification accuracy
- persona mapping quality
- retrieval source precision
- no unsupported hard claims in drafts
- correct source priority handling
- correct order lookup separation
- useful marketing insight quality

Target for demo:

- 90%+ answerability accuracy on sample tickets.
- 90%+ escalation routing accuracy on sample tickets.
- 90%+ persona mapping agreement after applying `docs/personas.md`.
- 100% of generated replies have at least one evidence source.
- 0 unsupported hard product claims in reviewed golden examples.

## 11. Bonus Requirements

The bonus system is External Sentiment Benchmarking.

It should compare internal ticket frequency against external market sentiment to answer:

```text
Is this a BOLDR-specific concern, or a market-wide signal BOLDR can capitalize on?
```

### 11.1 External Source Types

Use at least two, ideally four, source types:

1. Reddit watch communities
   - `r/Watches`
   - `r/MicrobrandWatches`
   - `r/Watchexchange`
2. Watch forums
   - WatchUSeek threads
   - other public watch forums where relevant
3. Watch community/review platforms
   - WatchCrunch reviews, posts, collections, and marketplace signals
4. Competitor and comparable-brand reviews
   - microbrand watch reviews
   - field watch reviews
   - titanium watch reviews
   - strap/accessory reviews

### 11.2 Why These Sources Fit

- `r/Watches`: broad enthusiast and buyer discussion, useful for mainstream concerns, recommendations, and objections.
- `r/MicrobrandWatches`: concentrated audience for small independent watch brands, close to BOLDR's customer base.
- `r/Watchexchange`: resale and price-demand signal, useful for collector confidence and resale-value questions.
- WatchUSeek: long-form forum discussion with deep technical/material topics such as titanium, nickel allergy, FKM rubber, servicing, and microbrand quality.
- WatchCrunch: modern watch enthusiast platform with reviews, collections, marketplace, polls, and discussion signals.
- Competitor reviews: outside-in comparison against alternative field watches, titanium watches, microbrands, and strap/accessory brands.

### 11.3 External Benchmark Themes

Benchmark at least three themes. Recommended initial themes:

1. Titanium, nickel allergy, and hypoallergenic safety.
2. FKM/rubber straps, BPA/safety, and water/outdoor use.
3. Sustainability, vegan straps, recycling, packaging, and carbon-neutral shipping.
4. Microbrand quality, resale value, and collector confidence.
5. Gifting, engraving, personalisation, and corporate orders.

### 11.4 Bonus Output Schema

```json
{
  "theme": "Titanium and nickel allergy",
  "internal_ticket_count": 5,
  "internal_personas": ["Health-Conscious Buyer", "Enthusiast / Collector"],
  "external_sources": [
    {
      "source": "WatchUSeek",
      "mention_count": 18,
      "sentiment": "concerned_positive",
      "representative_claims": []
    }
  ],
  "classification": "market-wide concern with BOLDR product-page gap",
  "recommended_action": "Add a clear nickel-free/hypoallergenic materials table to product pages and FAQ.",
  "confidence": 0.78
}
```

### 11.5 Bonus Demo Strategy

Phase 1 demo:

- Create a curated external sentiment sample from real source URLs and short summaries.
- Use it to produce repeatable charts and insight cards.
- Make source URLs visible.

Phase 2 production:

- Add source connectors.
- Respect each platform's terms, robots, rate limits, and API requirements.
- Cache external mentions with timestamps.
- Re-run benchmarking monthly.

## 12. Recommended Technical Architecture

### 12.1 High-Level Stack

Frontend:

- Next.js with React and TypeScript.
- Tailwind CSS or a restrained component system.
- Dashboard-first UI, not a landing page.

Backend:

- Python FastAPI.
- Pydantic models for structured AI outputs.
- Background workers for ingestion, batch processing, clustering, and report generation.

Database:

- PostgreSQL with pgvector for production-quality local demo.
- Optional SQLite fallback only for fast local experiments.

AI/RAG:

- LlamaIndex for document ingestion, chunking, retrieval, and query pipelines.
- Use LangGraph/LangChain only if the workflow benefits from explicit state-machine orchestration.
- Hybrid retrieval: pgvector + keyword/BM25 + structured lookup.

Model provider:

- GLM-5.1 via FPT AI Factory.
- Use a provider adapter around the FPT chat completions endpoint so the provider can be swapped.
- The current GLM endpoint is `https://mkp-api.fptcloud.com/v1/chat/completions` and returns a wrapped response with `code`, `message`, and `data`.
- The provider adapter sends `thinking={"type":"disabled"}` by default for low-latency support drafting; enable thinking only for heavier reasoning workflows.
- Ad-hoc customer chat uses GLM for the final evidence-grounded draft whenever `AI_LIVE_ENABLED=true` and credentials are configured. Model output must match the `DraftReplyOutput` schema and cite supplied evidence IDs. By default, invalid live output blocks the customer reply for human review instead of silently using a template. For public demo deployments, `AI_DETERMINISTIC_FALLBACK_ENABLED=true` may allow the existing deterministic evidence-grounded draft to be used after a live provider timeout or validation failure, with the same human approval gate preserved.

Embeddings:

- Prefer open-source local embeddings for the KB:
  - `BAAI/bge-m3`
  - `BAAI/bge-small-en-v1.5`
  - `intfloat/e5-large-v2`
- If latency/setup is a blocker, allow a provider embedding adapter behind the same interface.

Background jobs:

- Arq, RQ, Celery, or FastAPI background tasks.
- For demo simplicity, start with synchronous batch jobs and upgrade when needed.

Local development:

- Docker Compose for Postgres/pgvector.
- `.env` for FPT AI Factory credentials and GLM model names.
- Seed script that ingests all local documents and tickets.

### 12.2 System Components

1. Document Loader
   - Parses PDF, DOCX, and CSV files.
   - Stores raw text, structured tables, and chunks.

2. Knowledge Indexer
   - Creates embeddings.
   - Applies source priority metadata.
   - Builds BM25/keyword index.

3. Ticket Processor
   - Normalizes tickets.
   - Extracts intent, subquestions, order IDs, and tracking IDs.

4. Persona Classifier
   - Maps each enquiry to the five required personas.
   - Stores trigger keywords and explanation.

5. Evidence Retriever
   - Runs hybrid retrieval.
   - Performs structured lookup for rate cards/products.
   - Detects source conflicts.

6. Answerability Judge
   - Applies evidence thresholds and business rules.
   - Determines answer state and escalation.

7. Draft Generator
   - Creates customer reply, holding reply, internal note, or KB draft.
   - Produces structured JSON with validation.

8. Gap Manager
   - Tracks missing knowledge.
   - Groups duplicate gaps.
   - Generates FAQ drafts after human resolution.

9. Theme Clusterer
   - Groups weekly/monthly patterns.
   - Produces theme labels, trend direction, and recommended actions.

10. Marketing Brief Generator
   - Converts themes into product page, FAQ, campaign, and persona recommendations.

11. External Benchmark Engine
   - Bonus phase.
   - Collects or imports external signals.
   - Compares internal themes with external sentiment.

## 13. Suggested Data Model

Core tables:

- `tickets`
- `documents`
- `document_chunks`
- `rate_card_items`
- `product_specs`
- `ticket_runs`
- `retrieval_evidence`
- `draft_replies`
- `gap_records`
- `kb_drafts`
- `theme_clusters`
- `marketing_briefs`
- `external_sources`
- `external_mentions`
- `external_theme_benchmarks`

Important fields:

- source priority
- confidence
- generated output JSON
- model provider/model name
- prompt version
- approval status
- reviewer notes
- created/updated timestamps

## 14. API Requirements

Suggested endpoints:

```text
POST /api/ingest/local
GET  /api/documents
GET  /api/tickets
POST /api/tickets/{ticket_id}/process
POST /api/tickets/process-batch
GET  /api/tickets/{ticket_id}/intelligence
POST /api/drafts/{draft_id}/approve
POST /api/drafts/{draft_id}/reject
GET  /api/gaps
POST /api/gaps/{gap_id}/resolve
POST /api/gaps/{gap_id}/draft-kb-entry
GET  /api/themes
POST /api/themes/cluster
GET  /api/marketing-briefs
POST /api/marketing-briefs/generate
GET  /api/external/benchmarks
POST /api/external/benchmarks/generate
```

Implemented through Phase 12:

```text
GET  /health
GET  /api/meta
GET  /api/datasets/diagnostics
GET  /api/datasets/sources
GET  /api/datasets/samples
GET  /api/intelligence/classifications
GET  /api/intelligence/classifications/{ticket_id}
GET  /api/intelligence/evaluation
GET  /api/retrieval/search
GET  /api/retrieval/tickets/{ticket_id}
GET  /api/retrieval/evaluation
GET  /api/ai/status
GET  /api/ai/schemas
GET  /api/ai/prompt-preview/{ticket_id}
GET  /api/drafts
GET  /api/drafts/evaluation
GET  /api/drafts/tickets/{ticket_id}
POST /api/drafts/tickets/{ticket_id}/review
GET  /api/workflow/overview
GET  /api/tickets
GET  /api/tickets/{ticket_id}
GET  /api/tickets/{ticket_id}/intelligence
POST /api/tickets/{ticket_id}/process
POST /api/tickets/process-batch
GET  /api/gaps
GET  /api/gaps/metrics
GET  /api/gaps/{gap_id}
POST /api/gaps/{gap_id}/resolve
POST /api/gaps/{gap_id}/draft-kb-entry
POST /api/gaps/{gap_id}/review-kb-entry
GET  /api/themes/radar
GET  /api/marketing-briefs/current
POST /api/marketing-briefs/generate
GET  /api/evaluation/scorecard
GET  /api/external/sources
GET  /api/external/mentions
GET  /api/external/benchmarks
POST /api/external/benchmarks/generate
```

The Phase 12 frontend consumes these APIs in a single interactive workbench:

- inbox list with search, filters, and batch processing
- ticket review with customer message, routing tags, editable draft, evidence, guardrails, and review actions
- knowledge gap queue with verified resolution, two editable resolution suggestions, FAQ draft generation, suggested FAQ section, product-page update flags, gap metrics, generated FAQ preview, and FAQ approve/reject review gates
- weekly theme clustering with frequency, trend, dominant persona, source ticket IDs, product-page gap flags, KB actions, and marketing actions
- monthly marketing intelligence brief headed by the exact required product-page-gap question, with persona tags, evidence ticket IDs, campaign angles, and recommended page updates
- embedded external benchmark summary with three highlighted themes, internal ticket counts, external mention counts, market-wide/BOLDR-specific classification, confidence, recommendation, and public source links
- quality scorecard with threshold metrics, documented exceptions, golden fixtures, and issue list
- external benchmarking cards with source registry, public source URLs, source limitations, internal-vs-external signal comparison, sentiment, and recommended actions

## 15. AI Output Contracts

All LLM calls that drive product behavior must return validated JSON. Free-form text is acceptable only inside fields such as `draft_reply`, `internal_note`, or `brief_markdown`.

Required contracts:

- intent classification output
- persona classification output
- evidence sufficiency output
- draft reply output
- gap record output
- KB entry draft output
- theme cluster output
- marketing brief output
- external benchmark output

Every output should store:

- prompt version
- model name
- input source IDs
- output JSON
- validation status
- error/retry information

## 16. Human Approval Model

The app must make approval gates visible:

- Reply drafts require CS approval.
- KB drafts require CS lead approval.
- Marketing briefs are generated recommendations, not automated website changes.
- External sentiment conclusions include confidence and source limitations.

Approval statuses:

- `draft`
- `needs_review`
- `approved`
- `edited_and_approved`
- `rejected`
- `sent_or_exported`

## 17. Demo Storyline

The demo should show the intelligence loop in one coherent flow:

1. Load the sample inbox.
2. Run batch processing.
3. Open a straightforward answerable ticket, such as BPA-free strap.
4. Show retrieved evidence from FAQ/product reference.
5. Approve the draft reply.
6. Open a knowledge gap, such as carbon-neutral shipping or strap recycling.
7. Show the system refusing to hallucinate and creating a gap record.
8. Add a human resolution.
9. Generate a new FAQ draft.
10. Open Theme Radar and show rising sustainability/materials signals.
11. Generate Monthly Marketing Brief.
12. Bonus: compare one theme against external signals and show market-wide vs BOLDR-specific conclusion.

## 18. Example Intelligence Cases

### 18.1 Answerable Case: BPA-Free Strap

Expected:

- Persona: Health-Conscious Buyer.
- Sources: FAQ and product reference.
- Draft answer confirms FKM rubber and nylon straps are BPA-free.
- Marketing signal: product badge opportunity.

### 18.2 Knowledge Gap Case: Carbon-Neutral Shipping

Expected:

- Persona: Sustainability Advocate.
- Answerability: knowledge gap.
- Holding reply generated.
- Gap owner: Operations or Marketing.
- Marketing signal: sustainability page/FAQ opportunity.
- No claim that carbon-neutral shipping exists unless human confirms.

### 18.3 Order-Specific Case: Tracking Not Updating

Expected:

- Operational tag: order lookup required.
- Static KB cannot resolve.
- Draft internal note asks CS to check Shopify/carrier.
- Customer reply should not invent status.

### 18.4 Conflict Case: Servicing Prices

Expected:

- Rate card wins over SOP.
- UI shows source conflict warning.
- Draft uses structured rate-card pricing.

### 18.5 Product Price Case: Named Watch Model

Expected:

- Question such as "How much does Expedition Titanium cost?" retrieves structured product model evidence.
- Draft lists each matching named variant and SGD price, for example Expedition Titanium and Expedition Titanium - Ember Limited Edition.
- Draft does not answer a price question with unrelated material or grade information.

### 18.6 Bonus Case: Nickel Allergy

Expected:

- Internal tickets show health/safety concern.
- External sources show this is broader than BOLDR.
- Recommendation: product page material table, nickel-free strap guidance, and clear mesh bracelet caveat.

## 19. Milestones

### Milestone 1: Documentation And Data Foundation

- `AGENTS.md`, dataset guide, persona guide, and PRD complete.
- Ingestion scripts parse all six local files.
- Source priority rules encoded.

### Milestone 2: Core Backend Pipeline

- Ticket processing endpoint.
- Document index.
- Hybrid retrieval.
- Structured rate-card lookup.
- Answerability judge.
- Draft reply generator.

### Milestone 3: Workbench UI

- Chat-first Customer Chat landing view.
- Real sample enquiry dropdown and free-text judge input.
- Transparent AI review trace with source references.
- Approval controls for answerable drafts.
- CS Queue for unresolved gaps.
- System Details tab preserving Inbox Intelligence, Ticket Review, evidence cards, diagnostics, quality, and external benchmarking.

### Milestone 4: Self-Improving KB Loop

- Human resolution workflow.
- FAQ draft generation.
- KB approval status.
- Duplicate gap grouping.

### Milestone 5: Intelligence Outputs

- Theme Radar.
- Monthly Marketing Brief.
- Exportable Markdown/JSON.
- Evaluation dashboard.

### Milestone 6: Bonus External Benchmarking

- External source plan.
- Curated external sentiment dataset or connector.
- Theme comparison cards.
- Market-wide vs BOLDR-specific classification.

### Milestone 7: Future Integrations

- Gmail ingestion.
- Shopify order lookup.
- Google Drive/FAQ sync.
- Slack/email digest for weekly and monthly reports.

## 20. Future Integrations

### 20.1 Gmail

Not required for the first version because the local ticket CSV can simulate the inbox. Later Gmail integration should:

- ingest new messages
- preserve thread IDs
- draft replies, not send automatically
- label messages by status/persona/theme
- attach internal notes or links to the workbench

### 20.2 Shopify

Not required for the first version, but important for order-related tickets. Later Shopify integration should:

- look up order status
- retrieve tracking number
- check fulfillment status
- check refund status
- check whether address changes/cancellations are still possible

### 20.3 Google Drive Or Knowledge Base Sync

Later integration should:

- ingest FAQ updates from Drive
- export approved FAQ drafts
- version KB changes
- detect stale/conflicting source facts

## 21. Security, Privacy, And Governance

- Treat customer emails, names, and order IDs as sensitive.
- Do not send unnecessary PII to model providers.
- Redact or minimize PII in prompts where possible.
- Store model outputs with traceability.
- Make hallucination prevention a product feature.
- Preserve source evidence for every customer-facing claim.
- Keep approval logs for replies and KB updates.
- Use environment variables for provider keys.

## 22. Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Missing dataset files from brief | Use actual six files; document generated artifacts separately |
| Persona mismatch between brief and CSV | Final outputs use five required personas; CSV labels used as hints |
| Model hallucination | Evidence sufficiency gate, source citations, no-answer policy |
| Source conflicts | Source priority rules and conflict UI |
| External scraping fragility | Use curated demo data first; add compliant connectors later |
| GLM/FPT API differences | Provider adapter with isolated request/response parsing |
| Overbuilding | Phase milestones; core challenge first |
| Weak business insight | Tie every theme to persona, product page gap, and recommended action |

## 23. Acceptance Criteria

Core challenge is complete when:

- The app processes all 70 local tickets.
- The app can process ad-hoc judge questions through the same deterministic classification, retrieval, and drafting gates.
- The app can reset ad-hoc demo enquiry state without changing fixture-backed metrics or source records.
- It searches all six actual dataset files.
- Each processed ticket has intent, persona, answerability, evidence, and action.
- Answerable tickets receive source-grounded reply drafts.
- Non-answerable tickets create gap or order-lookup records.
- Ad-hoc customer-facing replies and KB entries remain behind human approval gates.
- Human resolution can produce a draft FAQ entry with an explicit approve/reject review gate.
- Weekly theme clusters can be generated across all 70 tickets.
- Monthly marketing brief can be generated with evidence-backed opportunities.
- Quality scorecard can be generated with pass/fail/documented-exception metrics and golden fixtures.
- External benchmark cards can compare internal themes against curated public watch-community and review-source signals.
- External benchmark cards show source diversity, signal strength, rationale, validation steps, public source links, and source limitations.
- Five required personas are used exactly.
- No customer-facing answer is auto-sent.

Bonus-ready criteria:

- External source model exists.
- At least two external source types are identified.
- At least three benchmark themes are supported.
- Output answers BOLDR-specific vs market-wide with recommended action.

## 24. Reference Links

Local project references:

- `Challenge Brief_BOLDR.pdf`
- `Boldr Data/`
- `docs/sample-dataset.md`
- `docs/personas.md`
- `AGENTS.md`

External research references for implementation planning:

- FPT AI Factory GLM-5.1 chat completions endpoint: `https://mkp-api.fptcloud.com/v1/chat/completions`
- r/Watches: https://www.reddit.com/r/Watches/
- r/MicrobrandWatches: https://www.reddit.com/r/MicrobrandWatches/
- r/Watchexchange: https://www.reddit.com/r/Watchexchange/
- WatchCrunch: https://www.watchcrunch.com/
- WatchUSeek: https://www.watchuseek.com/
