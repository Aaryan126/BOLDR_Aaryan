# BOLDR Revenue Rocket Implementation Plan

Version: 0.1  
Date: 2026-05-16  
Primary references: `docs/prd.md`, `docs/sample-dataset.md`, `docs/personas.md`, `AGENTS.md`, `Challenge Brief_BOLDR.pdf`

## 1. Build Philosophy

The product should be built in phases with explicit quality gates. We should not move to the next phase until:

1. The phase deliverables are implemented.
2. Default automated checks pass.
3. Human verification checks are completed.
4. Any known gaps are documented as accepted follow-up work.

The first complete version should be a local-data, full-stack demo that feels like a real customer intelligence workbench. Gmail, Shopify, and live external ingestion are future integrations unless a later decision makes them necessary for the competition demo.

## 2. Working Assumptions

- Backend: Python/FastAPI.
- Frontend: Next.js/React/TypeScript.
- AI provider: GLM-5.1 through FPT AI Factory, behind a replaceable provider adapter.
- RAG layer: LlamaIndex preferred for ingestion/retrieval; LangGraph/LangChain only if explicit workflow orchestration becomes useful.
- Storage: PostgreSQL with pgvector preferred; SQLite fallback only if local setup becomes a blocker.
- Embeddings: local/open-source embeddings preferred.
- First version uses only local files under `Boldr Data/`.
- The five final personas must match `docs/personas.md` exactly.

## 3. Phase Gate Template

Every phase should end with this record updated in the phase notes or PR summary:

```text
Phase:
Status:
Implemented:
Default tests run:
Human verification completed:
Known issues:
Decision to proceed:
```

Default tests are repeatable checks run by the developer. Human verification tests are hands-on walkthroughs where the user, demo owner, or reviewer confirms that behavior makes sense.

## 4. Phase 0: Documentation Baseline

Status: Complete.

Goal: Establish the source-of-truth docs before writing the app.

Already created:

- `AGENTS.md`
- `docs/sample-dataset.md`
- `docs/personas.md`
- `docs/prd.md`
- `implementation_plan.md`

Default tests:

- Confirm all referenced local files exist.
- Confirm Markdown files render logically and contain no stale "to be created" references.
- Confirm the plan references the actual six dataset files, not the stale 11-file list from the brief.

Human verification:

- User confirms the PRD reflects the intended ambition.
- User confirms the five personas are exactly correct.
- User confirms phased implementation style.

Exit criteria:

- Docs are accepted as working references for the build.

## 5. Phase 1: Repository And App Scaffold

Status: Implemented; awaiting human verification.

Goal: Create the project structure and runnable local development environment.

Deliverables:

- Backend app scaffold under `backend/`.
- Frontend app scaffold under `frontend/`.
- Shared project docs remain at repo root and `docs/`.
- Environment config examples:
  - `.env.example`
  - backend config module
  - frontend API base URL config
- Local dev instructions in `README.md`.
- Basic health endpoints and landing dashboard shell.
- Optional Docker Compose for PostgreSQL/pgvector.

Recommended structure:

```text
backend/
  app/
    api/
    core/
    ingest/
    intelligence/
    models/
    services/
    tests/
  pyproject.toml

frontend/
  app/
  components/
  lib/
  package.json

docs/
Boldr Data/
AGENTS.md
README.md
implementation_plan.md
```

Default tests:

- Backend installs cleanly.
- Frontend installs cleanly.
- Backend health endpoint returns OK.
- Frontend dev server starts and renders shell.
- Lint/type checks pass for scaffolded code.
- No secrets committed.

Human verification:

- Open the frontend locally.
- Confirm it looks like a workbench/dashboard, not a marketing landing page.
- Confirm visible navigation matches planned product areas:
  - Inbox Intelligence
  - Ticket Review
  - Knowledge Gaps
  - Theme Radar
  - Marketing Brief
  - External Benchmarking placeholder

Exit criteria:

- Both apps run locally.
- README contains exact local startup commands.

## 6. Phase 2: Local Data Ingestion And Normalization

Status: Implemented; awaiting human verification.

Goal: Parse all six actual dataset files and normalize them into reliable internal records.

Deliverables:

- Parsers for:
  - `01_customer_tickets.csv`
  - `03a_rate_card_engraving.csv`
  - `03b_rate_card_servicing.csv`
  - `04_faq_document.pdf`
  - `05a_SOP.docx`
  - `05b_product_reference.docx`
- Data models for:
  - tickets
  - documents
  - document sections
  - chunks
  - rate card items
  - product specs
- Seed command:
  - ingest all local files
  - print counts
  - store normalized data
- Source priority metadata encoded.
- Dataset diagnostics endpoint or CLI summary.

Default tests:

- Unit tests for each parser.
- Snapshot/count tests:
  - 70 tickets loaded.
  - 10 engraving rate card rows loaded.
  - 10 servicing rate card rows loaded.
  - FAQ sections detected.
  - SOP sections detected.
  - product models and strap catalogue detected.
- Validate ticket fields are present.
- Validate no missing local files.
- Validate source priorities are assigned correctly.

Human verification:

- Review ingestion summary.
- Spot-check at least one parsed record from every file.
- Confirm the app shows all six files as available knowledge sources.
- Confirm the app warns that the brief mentions 11 files but only six local files exist.

Exit criteria:

- Every local data file is parsed and inspectable in the app or via API.
- The project has a repeatable seed/reset path.

## 7. Phase 3: Deterministic Classification Baseline

Status: Implemented; awaiting human verification.

Goal: Build a non-LLM baseline for ticket classification, persona mapping, routing, and answerability so the system has predictable behavior before adding generation.

Deliverables:

- Ticket normalization service.
- Rule-based extraction:
  - order IDs
  - tracking IDs
  - channel
  - customer question text
  - question type hints
- Required persona mapper using `docs/personas.md`.
- Operational tags:
  - `order_lookup_required`
  - `knowledge_gap`
  - `pricing_question`
  - `safety_question`
  - `gift_or_personalisation`
  - `outdoor_use`
  - `sustainability_signal`
  - `source_conflict_possible`
- Initial answerability rules.
- Evaluation report comparing baseline against CSV labels where useful.

Default tests:

- Persona mapping tests for representative tickets:
  - BPA-free -> Health-Conscious Buyer
  - engraving gift -> Gifter
  - titanium/Miyota/limited edition -> Enthusiast / Collector
  - swimming/shock/FKM -> Active / Outdoor Buyer
  - vegan/recycling/carbon-neutral -> Sustainability Advocate
- Order lookup tests:
  - tracking and order status tickets are not treated as static KB answers.
- Escalation tests:
  - knowledge gaps escalate.
  - order-specific tickets create operational tasks.
- Baseline evaluation command runs over all 70 tickets.

Human verification:

- Review 10 tickets across all five personas.
- Confirm transactional CSV labels are not exposed as final personas.
- Confirm persona reasoning is visible and understandable.
- Confirm the baseline flags known tricky cases:
  - carbon-neutral shipping
  - strap recycling
  - MRI/magnetic resistance
  - tracking not updating
  - servicing older models

Exit criteria:

- Every ticket receives a required persona, intent, operational tags, and initial answerability state.
- No AI generation is required for this phase to pass.

## 8. Phase 4: Knowledge Retrieval And Evidence Layer

Status: Implemented; awaiting human verification.

Goal: Search the knowledge base with explainable evidence before drafting answers.

Deliverables:

- Chunking pipeline for FAQ, SOP, and product reference.
- Structured lookup for rate cards and product specs.
- Hybrid retrieval:
  - keyword search
  - vector search
  - structured table lookup
- Evidence cards with:
  - file
  - section/source type
  - matched text
  - source priority
  - confidence or score
- Source priority enforcement.
- Conflict detection for known rate card vs SOP pricing/turnaround mismatches.

Default tests:

- Retrieval tests for golden questions:
  - BPA-free straps retrieves FAQ/product safety info.
  - Grade 5 titanium retrieves Expedition product reference.
  - caseback engraving price retrieves engraving rate card.
  - regulation service retrieves servicing rate card.
  - strap compatibility retrieves product reference/FAQ.
  - return policy retrieves FAQ/SOP.
- Conflict tests:
  - servicing prices prefer `03b_rate_card_servicing.csv`.
  - engraving prices prefer `03a_rate_card_engraving.csv`.
- No-answer retrieval tests:
  - carbon-neutral shipping has insufficient evidence.
  - strap recycling has insufficient evidence.
  - MRI safety has insufficient evidence.

Human verification:

- Open evidence cards for at least 12 tickets.
- Confirm evidence excerpts actually support the answerability decision.
- Confirm source conflict warnings are understandable.
- Confirm structured rate cards are easier to inspect than raw text chunks.

Exit criteria:

- Every answerable ticket has at least one evidence source.
- Known unsupported questions remain unsupported.

Implementation notes:

- Added local hybrid retrieval in `backend/app/intelligence/retrieval.py`.
- Added retrieval API endpoints:
  - `/api/retrieval/search`
  - `/api/retrieval/tickets/{ticket_id}`
  - `/api/retrieval/evaluation`
- Added retrieval CLI: `python -m app.intelligence.retrieval_cli`.
- Added backend regression tests for golden questions, rate-card priority, unsupported themes, ticket evidence, and API endpoints.
- Updated the dashboard to show Phase 4 evidence coverage and source-priority metrics.

Phase gate record:

```text
Phase: 4 - Knowledge Retrieval And Evidence Layer
Status: Implemented; awaiting human verification
Implemented: Hybrid local retrieval, evidence cards, unsupported-theme blocking, source-priority checks, API/CLI/UI summary
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit
Human verification completed: Pending
Known issues: No semantic embedding database yet; current vector scoring is standard-library TF-IDF until the planned pgvector/local-embedding phase
Decision to proceed: Pending user review
```

## 9. Phase 5: GLM-5.1 Adapter And Structured AI Outputs

Status: Implemented; awaiting human verification.

Goal: Add the LLM layer through a replaceable GLM-5.1/FPT AI Factory provider adapter with validated JSON outputs.

Deliverables:

- Provider interface:
  - chat completion
  - JSON mode or JSON repair/validation
  - retry handling
  - timeout handling
  - model name config
- GLM-5.1/FPT AI Factory implementation using the chat completions endpoint.
- Fake/local provider for tests.
- Pydantic schemas for:
  - intent refinement
  - persona reasoning
  - evidence sufficiency
  - draft reply
  - gap record
  - KB draft
  - theme cluster
  - marketing brief
- Prompt versioning.
- PII minimization/redaction for prompts where feasible.

Default tests:

- Unit tests use fake provider, not live GLM inference.
- Schema validation tests reject malformed LLM output.
- Prompt input builder excludes unnecessary customer email/name where not needed.
- Provider adapter can be smoke-tested only when FPT AI Factory env vars are present.
- Golden output tests for a small fixture set.

Human verification:

- With FPT AI Factory credentials configured, process 5 tickets live:
  - one safety
  - one engraving
  - one servicing
  - one order lookup
  - one knowledge gap
- Confirm outputs are structured, readable, and not overconfident.
- Confirm unsupported claims are refused or routed to gaps.

Exit criteria:

- AI calls are behind an interface.
- App can run tests without live AI credentials.
- Live GLM smoke test works when credentials are available.

Implementation notes:

- Added GLM/FPT settings to `.env.example`.
- Added `.gitignore` coverage for local env files, caches, logs, and test artifacts.
- Added provider interface, FPT GLM adapter, fake provider, response parser, and retry/timeout controls.
- Added Pydantic structured-output contracts for intent, persona, evidence sufficiency, replies, gaps, KB drafts, theme clusters, and marketing briefs.
- Added redacted prompt preview for evidence-sufficiency judging.
- Added API endpoints:
  - `/api/ai/status`
  - `/api/ai/schemas`
  - `/api/ai/prompt-preview/{ticket_id}`
- Added backend tests for fake-provider validation, malformed JSON rejection, prompt redaction, FPT response parsing, and AI API endpoints.
- Updated dashboard to show GLM/FPT provider readiness and structured-contract count.

Phase gate record:

```text
Phase: 5 - GLM-5.1 Adapter And Structured AI Outputs
Status: Implemented; awaiting human verification
Implemented: Provider adapter, fake provider, schema contracts, prompt redaction, AI status/schema APIs, dashboard panel
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit
Human verification completed: Pending
Known issues: No live GLM smoke test was run because credentials are not present in the repo
Decision to proceed: Pending user review
```

## 10. Phase 6: Reply Drafting And Answerability Judge

Status: Implemented; awaiting human verification.

Goal: Generate grounded reply drafts only when evidence is sufficient.

Deliverables:

- Answerability judge combining:
  - deterministic rules
  - retrieval evidence
  - LLM evidence sufficiency check
- Draft reply generator.
- Holding reply generator for gaps.
- Internal escalation note generator.
- Approval status model.
- Reply evidence trace.
- "Do not hallucinate" guardrails.

Default tests:

- Golden reply tests for representative answerable tickets:
  - BPA-free strap
  - engraving cost
  - full service included
  - Expedition vs Journey
  - strap compatibility
- Golden no-answer tests:
  - carbon-neutral shipping
  - strap recycling
  - MRI resistance
  - live tracking/order status
- Assert every customer-facing hard claim has evidence.
- Assert order-specific tickets do not invent order status.
- Assert replies avoid banned tone patterns:
  - "Dear Sir/Madam"
  - default "Great question!"
  - unsupported timeline promises

Human verification:

- Review 15 generated ticket outputs.
- Confirm reply tone feels premium, friendly, and direct.
- Confirm evidence shown in UI supports the reply.
- Edit and approve at least one draft.
- Reject at least one draft and confirm status updates.

Exit criteria:

- Answerable tickets produce usable drafts.
- Unsupported tickets produce gap/holding outputs.
- Approval workflow exists.

Implementation notes:

- Added deterministic evidence-sufficiency judging that combines classification, retrieval evidence, unsupported-theme detection, and structured-output schemas.
- Added draft generation for:
  - customer replies when local evidence is sufficient
  - holding replies for knowledge gaps
  - internal notes for order/system lookup or human review
- Added evidence traces and guardrails for banned tone patterns, unsupported claims, missing evidence IDs, and invented order status.
- Added in-memory draft review state for approve, edit-and-approve, and reject actions.
- Added API endpoints:
  - `/api/drafts`
  - `/api/drafts/evaluation`
  - `/api/drafts/tickets/{ticket_id}`
  - `/api/drafts/tickets/{ticket_id}/review`
- Added draft CLI: `python -m app.intelligence.draft_cli`.
- Added backend regression tests for answerable golden tickets, unsupported themes, order lookup notes, guardrail coverage, metrics, and review flow.
- Updated the dashboard to show Phase 6 draft, holding-reply, internal-note, and guardrail metrics.

Phase gate record:

```text
Phase: 6 - Reply Drafting And Answerability Judge
Status: Implemented; awaiting human verification
Implemented: Evidence-gated customer drafts, holding replies, internal notes, guardrails, approval/review state, API/CLI/UI summary
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit
Human verification completed: Pending
Known issues: Draft approvals are in-memory for this phase; durable persistence moves to the storage/database phase
Decision to proceed: Pending user review
```

## 11. Phase 7: Core Backend API

Status: Implemented; awaiting human verification.

Goal: Expose the intelligence workflow through stable API endpoints.

Deliverables:

- Endpoints for:
  - local ingestion
  - tickets list
  - ticket detail
  - process one ticket
  - process batch
  - evidence detail
  - draft approval/rejection
  - gaps list/detail
  - resolve gap
  - generate KB draft
  - theme clusters
  - marketing briefs
- Consistent API response envelopes.
- Error handling and validation.
- API docs via OpenAPI.
- Seed/reset command.

Default tests:

- API integration tests.
- Contract tests for core endpoints.
- Batch process test over all 70 tickets.
- Error tests for missing ticket, malformed approval, unresolved gap.
- OpenAPI generation works.

Human verification:

- Use API docs or frontend to process one ticket and batch process all tickets.
- Confirm errors are readable.
- Confirm generated data persists across page refresh.

Exit criteria:

- Backend supports all core UI needs.
- Batch processing is repeatable.

Implementation notes:

- Added workflow API models for ticket summaries/details, process runs, gap records, gap resolution, KB draft output, and response envelopes.
- Added workflow service that composes local tickets, classifications, retrieval results, draft outputs, guardrail results, and generated gap records.
- Added stable workflow endpoints:
  - `/api/workflow/overview`
  - `/api/tickets`
  - `/api/tickets/{ticket_id}`
  - `/api/tickets/{ticket_id}/intelligence`
  - `/api/tickets/{ticket_id}/process`
  - `/api/tickets/process-batch`
  - `/api/gaps`
  - `/api/gaps/{gap_id}`
  - `/api/gaps/{gap_id}/resolve`
  - `/api/gaps/{gap_id}/draft-kb-entry`
- Added consistent `{ status, data, meta }` envelopes for ticket lists, ticket detail, process responses, and gap responses.
- Added backend contract tests for filters, full ticket traces, single/batch process runs, gap resolution, KB draft generation, and readable missing-resource errors.
- Updated the dashboard to show Phase 7 workflow API readiness and review-queue metrics.

Phase gate record:

```text
Phase: 7 - Core Backend API
Status: Implemented; awaiting human verification
Implemented: Ticket list/detail/intelligence APIs, single and batch process APIs, gap list/detail/resolve/KB-draft APIs, workflow overview, response envelopes, API contract tests, UI readiness panel
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit
Human verification completed: Pending
Known issues: Workflow run and gap-resolution state is process-memory only until the database persistence phase
Decision to proceed: Pending user review
```

## 12. Phase 8: Frontend Workbench UI

Status: Implemented; awaiting human verification.

Goal: Build the main user-facing workbench for the core challenge.

Deliverables:

- Inbox Intelligence dashboard.
- Ticket Review screen.
- Knowledge Gaps queue.
- Theme Radar placeholder or initial view.
- Marketing Brief placeholder or initial view.
- Evidence cards.
- Approval/edit/reject controls.
- Filters, search, and status indicators.
- Responsive layout for desktop and reasonable tablet/mobile behavior.

Default tests:

- Frontend lint and type checks.
- Component tests for key display states.
- API integration smoke test.
- Playwright tests:
  - dashboard loads
  - batch process action works
  - ticket detail opens
  - evidence cards render
  - draft approval changes status
  - gap queue renders
- Accessibility checks for labels, contrast, keyboard navigation where feasible.

Human verification:

- Walk through the demo storyline:
  - run intelligence pass
  - open answerable ticket
  - approve draft
  - open gap ticket
  - inspect holding reply and gap record
- Confirm the UI feels like an operational CS tool, not a generic chatbot.
- Confirm text does not overflow or overlap on common viewport sizes.

Exit criteria:

- Core workflow can be demonstrated from the UI without manual API calls.

Implementation notes:

- Added an interactive client workbench as the first operational surface on the dashboard.
- Added Inbox Intelligence UI with ticket search, filters, selected-ticket state, and batch process action.
- Added Ticket Review UI with:
  - customer message
  - persona/answerability/reply-type chips
  - routing tags
  - editable draft reply
  - reviewer note
  - approve, save edit, and reject actions
  - evidence cards
  - guardrail checks
- Added Knowledge Gaps UI with:
  - gap queue
  - selected gap detail
  - verified resolution field
  - resolve gap action
  - FAQ draft action
  - generated FAQ preview
- Added frontend API types for ticket workflow details, draft review state, evidence cards, and gap records.
- Updated dashboard phase status and browser layout constraints for the larger workbench surface.

Phase gate record:

```text
Phase: 8 - Frontend Workbench UI
Status: Implemented; awaiting human verification
Implemented: Interactive inbox, ticket review, draft approval/edit/reject controls, evidence cards, guardrail display, gap queue, gap resolution, FAQ draft preview, responsive workbench layout
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit, Playwright desktop/mobile smoke
Human verification completed: Pending
Known issues: UI state still depends on in-memory backend workflow state until durable persistence is added
Decision to proceed: Pending user review
```

## 13. Phase 9: Knowledge Gap And KB Draft Loop

Status: Implemented; awaiting human verification.

Goal: Complete the self-improving knowledge base loop.

Deliverables:

- Gap grouping/deduplication.
- Human resolution form.
- KB draft generator in FAQ format.
- Suggested FAQ section.
- Product page update flag.
- Gap status progression:
  - `new`
  - `needs_human_answer`
  - `awaiting_supplier`
  - `resolved_needs_kb_draft`
  - `kb_draft_ready`
  - `approved`
  - `rejected`
- Gap metrics:
  - by theme
  - by persona
  - by owner
  - by status

Implementation notes:

- Added `/api/gaps/metrics` for status, owner, persona, marketing-signal, product-page-update, and top-theme counts.
- Added `/api/gaps/{gap_id}/review-kb-entry` for approve/reject review of generated FAQ drafts.
- Gap records now expose suggested FAQ section, product page update flag, KB review note, and review timestamp.
- Workbench UI now shows gap signal metrics, suggested FAQ sections, product-page update flags, and approve/reject FAQ actions.

Default tests:

- Resolve a gap and generate KB draft.
- Reject a KB draft and preserve reviewer note.
- Approve a KB draft and update status.
- Duplicate gap grouping test for related sustainability questions.
- Confirm unresolved gaps do not become customer-facing facts.

Human verification:

- Resolve carbon-neutral shipping with a mock human answer.
- Generate and review FAQ entry.
- Resolve strap recycling with a mock human answer.
- Confirm FAQ style matches `04_faq_document.pdf`.
- Confirm marketing flags appear for sustainability/product-page updates.

Exit criteria:

- The self-improving loop is visible and functional end to end.

Phase gate record:

```text
Phase: 9 - Knowledge Gap And KB Draft Loop
Status: Implemented; awaiting human verification
Implemented: Gap metrics endpoint, product-page update flags, suggested FAQ sections, KB draft approval/rejection endpoint, review notes/timestamps, workbench gap signal metrics, FAQ approve/reject controls
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit, git diff check, Playwright desktop/mobile smoke
Human verification completed: Pending
Known issues: Gap review state is still in-memory until durable persistence is added
Decision to proceed: Pending user review
```

## 14. Phase 10: Theme Radar And Marketing Brief

Status: Implemented; awaiting human verification.

Goal: Generate the required weekly clustering and monthly marketing intelligence outputs.

Deliverables:

- Theme clustering pipeline.
- Theme Radar UI.
- Monthly Marketing Brief generator.
- Exportable Markdown/JSON brief.
- Evidence-backed recommendations.
- Persona distribution per theme.
- Product page gap flags.
- Campaign/action recommendations.

Implementation notes:

- Added `/api/themes/radar`, `/api/marketing-briefs/current`, and `/api/marketing-briefs/generate`.
- Theme radar deterministically clusters all 70 tickets into the nine planned business themes.
- Theme records include frequency, trend direction, representative ticket IDs, customer wording, answerability breakdown, persona breakdown, product-page gap flag, marketing signal flag, gap count, and recommendations.
- Monthly marketing brief outputs Markdown plus structured opportunities with persona focus, campaign angle, recommended action, evidence ticket IDs, and product-page update flag.
- Frontend now includes Theme Radar cards, opportunity cards, and the generated marketing brief.

Default tests:

- Cluster all 70 tickets.
- Verify expected themes appear:
  - Materials and Safety
  - Engraving and Personalisation
  - Strap Compatibility
  - Watch Servicing and Aftercare
  - Orders, Shipping, and Returns
  - Active and Outdoor Use
  - Sustainability and Ethics
  - Collector and Technical Specs
  - Corporate and Gifting
- Marketing brief includes ticket evidence.
- Marketing brief includes persona tags.
- Marketing brief includes action recommendations.
- Snapshot tests for report structure.

Human verification:

- Read the generated monthly brief.
- Confirm it answers: "What customers are asking that is not on your product pages."
- Confirm recommendations are concrete and useful.
- Confirm insights are not just summaries of ticket counts.
- Confirm persona framing matches the five required personas.

Exit criteria:

- The core challenge can be demonstrated completely.

Phase gate record:

```text
Phase: 10 - Theme Radar And Marketing Brief
Status: Implemented; awaiting human verification
Implemented: Theme radar API, marketing brief API, deterministic 70-ticket clustering, evidence-backed opportunity generation, Theme Radar UI, Markdown brief UI
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit, git diff check, Playwright desktop/mobile smoke
Human verification completed: Pending
Known issues: Trend direction is inferred from the sample ticket date split; durable report persistence/export files are planned later
Decision to proceed: Pending user review
```

## 15. Phase 11: Evaluation And Quality Dashboard

Status: Implemented; awaiting human verification.

Goal: Make system quality measurable and visible.

Deliverables:

- Evaluation script over all 70 tickets.
- Metrics dashboard or report:
  - answerability accuracy
  - escalation routing accuracy
  - persona mapping coverage
  - evidence coverage
  - unsupported-claim guardrail results
  - source conflict handling
- Golden fixtures for core scenarios.
- Regression tests for previous bugs.

Implementation notes:

- Added `/api/evaluation/scorecard`.
- Scorecard includes answerability accuracy, escalation routing accuracy, persona mapping coverage, evidence coverage, unsupported-claim guardrail count, source conflict handling, and golden fixture pass rate.
- Current scorecard status is `pass_with_notes` because answerability, persona mapping, evidence, guardrails, source priority, and golden fixtures pass, while CSV escalation-label agreement is below 90% and explicitly documented for human review.
- Golden fixtures cover BPA safety, carbon-neutral shipping gap, order lookup, engraving rate-card pricing, older-model servicing human review, and vegan strap gap.
- Frontend now shows quality metric cards, golden fixture status, and issue details.

Default tests:

- Evaluation script runs successfully.
- Minimum target thresholds are met or documented:
  - 90%+ answerability accuracy after local label mapping.
  - 90%+ escalation accuracy.
  - 100% evidence coverage for answerable replies.
  - 0 known unsupported hard claims in golden tests.
- All unit/integration/frontend tests pass.

Human verification:

- Review evaluation dashboard.
- Inspect failures and decide whether each is a bug, data mismatch, or acceptable caveat.
- Confirm the scorecard is suitable for a competition demo.

Exit criteria:

- We can defend the system's accuracy and safety in a demo.

Phase gate record:

```text
Phase: 11 - Evaluation And Quality Dashboard
Status: Implemented; awaiting human verification
Implemented: Evaluation scorecard API, threshold metrics, documented escalation-label exception, golden fixture checks, quality dashboard UI
Default tests run: backend pytest, frontend lint/type/build, docker compose config, npm audit, git diff check, Playwright desktop/mobile smoke
Human verification completed: Pending
Known issues: Escalation routing accuracy is 87.14% against CSV labels and is documented for review because several CSV escalation labels conflict with evidence-backed safe-answer behavior
Decision to proceed: Pending user review
```

## 16. Phase 12: Bonus External Sentiment Benchmarking

Goal: Implement the bonus challenge as a credible external signal comparison layer.

Deliverables:

- External source registry.
- Curated external sentiment sample dataset for reliable demo.
- Optional connector stubs for:
  - Reddit watch communities
  - WatchUSeek/public forum URLs
  - WatchCrunch/review sources
  - resale/marketplace signals
- External mention schema.
- Theme benchmark generator.
- External Benchmarking UI.
- At least three benchmark themes:
  - titanium, nickel allergy, and hypoallergenic safety
  - FKM/rubber straps, BPA/safety, and water/outdoor use
  - sustainability, vegan straps, recycling, packaging, carbon-neutral shipping
- Optional fourth/fifth themes:
  - microbrand quality, resale value, collector confidence
  - gifting, engraving, personalisation, corporate orders

Default tests:

- External sample imports successfully.
- At least two external source types are represented.
- At least three themes produce benchmark output.
- Each benchmark includes:
  - internal ticket count
  - external source summary
  - sentiment classification
  - BOLDR-specific vs market-wide classification
  - recommended action
  - source URLs
- Snapshot tests for benchmark card/report structure.

Human verification:

- Review source choices and confirm they fit BOLDR's buyers.
- Inspect three benchmark themes.
- Confirm conclusions are actionable, not generic.
- Confirm source limitations are visible.
- Confirm the bonus story is ambitious but credible.

Exit criteria:

- Bonus requirement can be demonstrated clearly.

## 17. Phase 13: Demo Polish And Competition Readiness

Goal: Turn the working system into a polished, stable demo.

Deliverables:

- Seeded demo data state.
- One-command or documented startup.
- Demo script.
- Reset script.
- Screenshots or short screen recording.
- Final README.
- Known limitations section.
- Optional architecture diagram.
- Optional sample exported marketing brief.

Default tests:

- Fresh setup test from clean checkout/folder.
- Backend tests pass.
- Frontend tests pass.
- Playwright demo path passes.
- Seed/reset works.
- No required secrets committed.
- App works without GLM/FPT credentials in demo/mock mode.
- App works with GLM/FPT credentials in live mode.

Human verification:

- Run full demo from start to finish:
  - ingest
  - batch process
  - approve reply
  - create gap
  - resolve gap
  - generate KB draft
  - generate theme radar
  - generate marketing brief
  - show bonus benchmark
- Confirm the story fits the brief: "Do not build a chatbot. Turn every customer question into product and marketing intelligence."
- Confirm the user can explain the architecture and business value.

Exit criteria:

- Ready for presentation/submission.

## 18. Future Integration Phases

These are planned after the local-data competition demo unless explicitly reprioritized.

### 18.1 Gmail Drafting Integration

Deliverables:

- Gmail OAuth.
- Thread ingestion.
- Draft reply creation.
- Labels for persona/theme/status.
- Human send control.

Tests:

- Test account integration.
- Draft created but not sent.
- PII handling reviewed.

### 18.2 Shopify Order Lookup Integration

Deliverables:

- Shopify Admin API adapter.
- Order lookup by order ID/email.
- Fulfillment/tracking/refund status.
- Address/cancellation feasibility rules.

Tests:

- Mock Shopify API tests.
- Sandbox store smoke test if available.
- Order-specific tickets no longer require manual simulated lookup.

### 18.3 Google Drive Or KB Sync

Deliverables:

- Drive document ingestion.
- Approved FAQ export.
- KB versioning.
- Stale fact detection.

Tests:

- Approved KB draft exports correctly.
- Re-ingestion detects updated FAQ entry.

## 19. Always-On Quality Rules

These apply across all phases:

- Do not auto-send customer replies.
- Do not auto-publish KB updates.
- Do not expose `transactional` as a final persona.
- Do not answer order-specific status from static KB.
- Do not use stale SOP prices over rate cards.
- Do not claim unsupported certifications, medical safety, or supplier facts.
- Every customer-facing hard claim needs evidence.
- Every LLM behavior that affects product output must have validated structured output.
- Tests must be runnable without live GLM/FPT credentials.
- Live GLM checks should be smoke tests, not the only test path.

## 20. Immediate Next Step

Complete Phase 11 human verification, then start Phase 12 by implementing the bonus external sentiment benchmarking layer.
