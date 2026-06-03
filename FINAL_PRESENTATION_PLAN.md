# BOLDR SignalDesk 5-Minute Final Presentation Plan

Purpose: prepare a winning Echelon Singapore 2026 AI Workflow Competition final presentation for BOLDR SignalDesk.

Recommended format: hybrid deck + embedded demo video + live voiceover.

Why this format: the finalist kit allows PPT, video, hybrid, or live demo formats. It also says a recorded demo is acceptable if it presents the workflow more clearly and reliably within time. For a strict five-minute stage slot, the safest winning format is: controlled slides for the first and last minute, and a tightly edited screen-recorded workflow demo in the middle with live narration.

## Source Requirements To Respect

From the finalist kit:

- Total live presentation: 5 minutes.
- Structure: 1 minute Show the origin / pain point, 3 minutes Demo the art of the build, 1 minute Tell the ROI / impact.
- Q&A: 3 minutes after the presentation.
- Judging focus for the live final: presentation quality, especially clarity to a non-technical audience.
- Phase 1 judging criteria still matter: technical execution, SME impact and business value, cost efficiency, responsible AI, proof of execution.
- Strict time limit. Do not go over.
- Slides-only, video, hybrid, and live demo are all acceptable.
- Backup files are expected: screenshots, slides, or recorded walkthrough in case the live demo fails.

From the BOLDR challenge brief:

- Do not build a generic chatbot.
- Build a self-improving customer intelligence engine.
- Core workflow: ingest enquiry, extract intent/context/persona, search KB, draft answer if supported, flag gaps without hallucinating, draft KB entries after human resolution, cluster weekly themes, produce monthly marketing intelligence.
- Bonus: compare internal support themes against external watch-market signals.
- Preserve human approval for replies and KB updates.

## Winning Narrative

One sentence:

> BOLDR SignalDesk turns every customer support email into either an evidence-backed draft, a safe knowledge-gap workflow, or a product and marketing signal.

The story should not be "I built an AI chatbot." The story should be:

1. BOLDR is losing intelligence inside ordinary support emails.
2. SignalDesk makes support evidence-based and approval-first.
3. Every unresolved question becomes a reusable KB improvement.
4. Every repeated question becomes a product-page or campaign signal.
5. The result is a practical system a 3-person CS team could actually run.

## Overall Format

Use 7 total slides:

1. Title / one-line promise.
2. Pain point and origin.
3. Workflow map.
4. Embedded demo video: answerable ticket.
5. Embedded demo video: knowledge gap to FAQ.
6. Embedded demo video: marketing intelligence and external benchmark.
7. ROI, cost, safeguards, proof.

Slide 1 and Slide 2 cover the first minute.

Slides 3 to 6 cover the three-minute demo section.

Slide 7 covers the last minute.

## Stage Setup

Use a single presentation file with embedded videos. Do not depend on internet or live clicking unless the judges specifically ask in Q&A.

Bring:

- Laptop, charger, HDMI/USB-C adapter.
- Local copy of the deck.
- Exported PDF version of the deck.
- Embedded demo videos as standalone `.mp4` files.
- Backup screenshots of the important UI states.
- Browser tabs preloaded with local app or deployed app, in case judges ask to see it live.
- Repo open locally with `SUBMISSION.md`, `WORKFLOW_DOCUMENTATION.md`, `README.md`, and tests visible for Q&A.

Preferred presentation mode:

- Fullscreen deck.
- Demo video clips autoplay inside slides or play on click.
- Live microphone voiceover throughout.
- Keep the cursor hidden during video unless the cursor is part of the recorded demo.

## Visual Style

The judges need clarity from a distance, not a dense technical readout.

Use this style:

- Background: dark charcoal / near-black with subtle BOLDR watch imagery or product texture.
- Accent colors: BOLDR orange, steel gray, off-white, and one signal color such as green for "supported" and amber for "gap".
- Typography: one strong sans-serif family, large headings.
- H1 size: 56-72 pt.
- Body size: 26-34 pt.
- Never use body text below 24 pt.
- Maximum words per slide: 25-35, except backup appendix slides.
- Use big numbers for metrics.
- Use one diagram, not a full architecture chart.
- Use actual product/demo screenshots, not generic AI imagery.
- Avoid paragraph blocks.
- Avoid small code screenshots in the main 5 minutes.

Use this visual language:

- "Supported" = green evidence badge.
- "Gap" = amber blocked-claim badge.
- "Human approval" = blue review badge.
- "Marketing signal" = orange insight badge.
- "External validation" = purple benchmark badge.

Main deck visual motif:

- A horizontal loop:
  `Email -> Evidence -> Draft or Gap -> Human Review -> FAQ Update -> Marketing Signal`

Do not show:

- Long backend code.
- Full API route list.
- Too many tiny screenshots.
- Raw challenge PDF screenshots unless needed in appendix.
- AI model claims without explaining safeguards.

## Exact 5-Minute Run Of Show

### 0:00-0:10 - Slide 1: Title

On screen:

```text
BOLDR SignalDesk

Support emails in.
Evidence-backed replies, KB updates, and marketing signals out.
```

Bottom corner:

```text
Built for BOLDR watch e-commerce | AI Workflow Competition Final
```

Visual:

- BOLDR logo or watch/product image.
- One simple loop icon: email -> evidence -> insight.

Voiceover:

> Hi, I am presenting BOLDR SignalDesk: an approval-first customer intelligence workflow for a small watch e-commerce team. It is not a chatbot. It is a system that turns every support email into either a source-backed reply, a knowledge gap, or a marketing signal.

Delivery notes:

- Speak slowly.
- Do not say "AI-powered" in the first sentence; everyone already expects AI. Lead with business value.

### 0:10-1:00 - Slide 2: The Origin / Pain Point

On screen:

```text
The problem is not answering one email.
The problem is forgetting what the email revealed.

3-person CS team
Manual source search
FAQ gaps repeat
Buyer signals vanish
```

Add one concrete example callout:

```text
"Are your straps BPA-free?"
Support answer today.
Product-page signal tomorrow.
```

Visual:

- Left: simplified inbox with repeated customer questions.
- Right: three lost outputs labeled `FAQ gap`, `Product-page gap`, `Campaign angle`.
- Use only 3-4 email cards. Keep them large.

Voiceover:

> BOLDR sells considered watches and straps, so customers ask detailed questions about materials, engraving, servicing, shipping, and sustainability. A three-person CS team can answer one ticket at a time, but the intelligence gets lost. When a customer asks whether a strap is BPA-free, that is not just a support question. It may be a product-page badge, an FAQ update, and a campaign angle. SignalDesk makes that loop repeatable.

Rubric coverage:

- Problem identification.
- Real SME problem.
- Why it matters.
- Who is affected.

Timing guard:

- At 1:00 exactly, say: "Here is how the workflow works."

## 3-Minute Demo Section

Recommended demo format: one edited video, split across slides 3-6. Total demo video runtime should be 2:15-2:30, leaving 30-45 seconds for live transitions and explanation.

Record the demo at 1080p or 1440p. Use browser zoom around 90-100%. Keep dark mode if the UI looks polished. Remove waiting time after clicks. Use smooth cuts.

### 1:00-1:20 - Slide 3: Workflow Map

On screen:

```text
One loop, three outcomes
```

Diagram:

```text
Customer email
  -> Intent + persona
  -> Evidence search
  -> Answerability gate
       -> Supported draft for approval
       -> Gap routed to CS
       -> Theme + marketing signal
```

Small footer:

```text
Sources: FAQ, product reference, SOP, engraving rate card, servicing rate card
```

Voiceover:

> The workflow has one important decision point: the answerability gate. It searches BOLDR's FAQ, product reference, SOP, and rate cards. If the answer is supported, it drafts for approval. If it is not supported, it creates a gap instead of guessing. Either way, the question feeds the theme and marketing layer.

Visual direction:

- This should be the only process diagram in the main presentation.
- Use thick arrows and labels, not tiny architecture boxes.

### 1:20-2:05 - Slide 4: Demo Part 1 - Answerable Ticket

Embedded video content:

1. Start on Customer Chat.
2. Show backend connected.
3. Enter:
   ```text
   Are BOLDR FKM straps BPA-free and safe for kids?
   ```
4. Show processing trace:
   - classify intent/persona
   - search KB
   - check answerability
   - draft reply
5. Jump to Approvals.
6. Show draft and evidence.
7. Show that human approval is required.

On-slide overlay text:

```text
Outcome 1: Supported answer -> draft for approval
```

Add three small badges:

```text
Health-Conscious Buyer
Source-backed
Human review
```

Voiceover:

> Here is the first outcome: an answerable customer enquiry.
>
> A customer asks whether BOLDR FKM straps are BPA-free and safe for kids.
>
> SignalDesk classifies the question as materials and safety, then maps it to the Health-Conscious Buyer persona.
>
> Now it searches BOLDR's actual knowledge sources and checks whether the answer is supported.
>
> That gate is important. If the evidence is not there, the system should not guess.
>
> In this case, the evidence is strong enough, so SignalDesk drafts a reply in BOLDR's tone.
>
> But it still does not send the answer automatically.
>
> The draft moves into the approval queue, with the supporting evidence attached, so the CS team can review, edit, approve, or reject it.
>
> So the first outcome is simple: faster support, but still source-backed and human-approved.

Pause points:

- After "answerable customer enquiry."
- After the customer question.
- After "Health-Conscious Buyer persona."
- After "the system should not guess."
- Before "But it still does not send..."

What the judges should understand:

- This is a working workflow.
- It uses actual BOLDR sources.
- It preserves human approval.
- It maps to required personas.

Avoid saying:

- "The model knows..."
- "The AI answers..."

Say instead:

- "The workflow retrieves evidence."
- "The system drafts only when supported."

### 2:05-2:55 - Slide 5: Demo Part 2 - Gap To FAQ Loop

Embedded video content:

1. Return to Customer Chat.
2. Enter:
   ```text
   What luminous material do you use on the dial? Is it Super-LumiNova? Is it safe?
   ```
3. Show answerability blocked.
4. Go to CS Queue.
5. Show missing knowledge, owner, priority, attempted evidence.
6. Paste verified resolution:
   ```text
   BOLDR uses non-radioactive luminous material on supported watch dials and hands. If a specific model uses Super-LumiNova, it should be mentioned in the product specifications for the specific model. The luminous material is intended for normal watch use and should not pose a safety concern when the watch is used as designed.
   ```
7. Resolve gap.
8. Click Draft KB Entry.
9. Show generated FAQ draft waiting for review.

On-slide overlay text:

```text
Outcome 2: Detailed product question -> knowledge gap and FAQ draft
```

Add three small badges:

```text
Luminous material
Product-team verification
FAQ draft
```

Voiceover:

> The second outcome is a knowledge gap, but it is a normal one for a premium watch brand.
>
> A customer asks what luminous material BOLDR uses on the dial, whether it is Super-LumiNova, and whether it is safe.
>
> SignalDesk can answer the general safety point, but it should not name a specific compound like Super-LumiNova unless that is verified for the model.
>
> So it does not guess.
>
> It creates a knowledge gap, shows the missing fact, and makes clear that the product team should verify the detail.
>
> Once a human adds the verified handling rule, SignalDesk drafts a reusable FAQ entry.
>
> That means one detailed product question becomes better product knowledge for the next customer.

What the judges should understand:

- Responsible AI is built into the workflow, not added as a disclaimer.
- The KB improves after human resolution.
- The system prevents repeated future work and improves product-page clarity.

### 2:55-3:45 - Slide 6: Demo Part 3 - Marketing Intelligence

Embedded video content:

1. Go to Marketing Intel.
2. Show top metrics:
   - 70 tickets processed
   - 9 themes detected
   - 6 marketing opportunities
3. Show Weekly Theme Clustering.
4. Show Monthly Brief: "What customers are asking that is not on your product pages."
5. Show External Benchmarking:
   - 7 external source groups
   - 12 curated external mentions
   - internal vs external theme comparison
6. Briefly show System Details or scorecard:
   - about 96% answerability accuracy
   - 100% evidence coverage for answerable tickets
   - 0 unsupported hard-claim guardrail failures

On-slide overlay text:

```text
Outcome 3: Support questions -> product and marketing signals
```

Add three large metric cards:

```text
70 tickets processed
9 themes detected
6 marketing opportunities
```

Voiceover:

> Finally, the same support data becomes business intelligence. Across 70 tickets, SignalDesk detects nine themes and six marketing opportunities. The monthly brief shows what customers are asking that product pages do not answer clearly enough. The bonus benchmark compares internal themes with external watch-market signals, so BOLDR can tell whether a topic is only a support gap or a broader market opportunity.

What the judges should understand:

- You solved the actual challenge brief, not just ticket response drafting.
- You included the bonus challenge.
- You connect support to revenue and product decisions.

Timing guard:

- At 3:45, the demo must be over.
- If the video runs longer, cut external benchmark scrolling first.

## Final 1-Minute ROI / Impact Section

### 3:45-5:00 - Slide 7: Business Impact

On screen:

```text
What BOLDR gets
```

Use four big impact blocks:

```text
Faster support
Evidence-backed drafts for answerable tickets

Safer support
Unsupported claims routed, not invented

Smarter KB
Human resolutions become draft FAQ updates

Revenue signals
Product-page gaps and campaign ideas from real customer wording
```

Add metric strip:

```text
70 tickets | ~96% answerability accuracy | 100% evidence coverage | 0 hard-claim guardrail failures
```

Cost line:

```text
Pilot estimate: ~$37-$75/month before credits
~$0.09-$0.19 per resolved/routed enquiry at 500 tickets/month
```

Responsible AI line:

```text
Approval-first: drafts are reviewed, FAQ updates are reviewed, risky claims are blocked.
```

Voiceover:

> The impact for BOLDR is practical. Answerable questions become faster evidence-backed drafts. Unsupported questions become safer CS tasks instead of risky claims. Verified resolutions become reusable FAQ drafts, so the same question does not keep coming back. And recurring customer language becomes product-page and campaign intelligence. In the current system, 70 tickets are processed, answerability accuracy is about 96 percent, evidence coverage for answerable tickets is 100 percent, and unsupported hard-claim guardrail failures are zero. For a small pilot, the estimated running cost is roughly 37 to 75 dollars per month before credits, or about 9 to 19 cents per resolved or usefully routed enquiry at 500 tickets a month. That is why SignalDesk is not just a demo. It is a realistic operating loop for a small e-commerce team.

End line:

> BOLDR does not just answer customers faster. It learns from what customers keep asking.

Do not add more after the end line. Stop cleanly.

## Exact Slide Construction Notes

### Slide 1: Title

Layout:

- Full-bleed dark watch/product background.
- Large title left.
- One-line promise below.
- Small footer with competition and BOLDR challenge.

Text size:

- Title: 68-76 pt.
- Promise: 36-44 pt.
- Footer: 18-22 pt.

Do not use:

- Multiple logos competing for attention.
- A paragraph explaining the project.

### Slide 2: Pain

Layout:

- Left half: "The problem is not answering one email."
- Right half: inbox-to-lost-signal visual.
- Bottom: BPA-free example as a single orange highlight.

Text size:

- Main statement: 48-60 pt.
- Supporting bullets: 28-34 pt.
- Example: 30-36 pt.

Visual:

- Show the transformation from support email to business signal.
- Make "3-person CS team" visible.

### Slide 3: Workflow

Layout:

- One horizontal flow.
- Three outcomes at the end.
- Use color coding.

Text size:

- Heading: 52-64 pt.
- Flow labels: 24-30 pt.

Critical detail:

- The answerability gate must be visually obvious.
- Human review must be visible.

### Slide 4: Answerable Demo

Layout:

- Embedded video full-width, taking 80-85% of slide.
- Top-left overlay: "Outcome 1: Supported answer."
- Bottom metric/badge row.

Video should show:

- Customer question.
- Trace.
- Approval queue.
- Evidence cards.

### Slide 5: Gap Demo

Layout:

- Embedded video full-width.
- Top-left overlay: "Outcome 2: Product detail gap to FAQ draft."
- Bottom badge row.

Video should show:

- Luminous-material safety question.
- Blocked answerability.
- CS queue.
- Verified resolution.
- FAQ draft.

### Slide 6: Marketing Demo

Layout:

- Embedded video or three large screenshots.
- Top: "Support becomes market intelligence."
- Right side or bottom: 70 / 9 / 6 metrics.

Video should show:

- Weekly clusters.
- Monthly marketing brief.
- External benchmark.
- Optional evaluation scorecard.

If video feels too fast:

- Replace this slide with three large screenshots and animate them one by one.
- Live voiceover can explain the relationship more clearly than fast scrolling.

### Slide 7: ROI

Layout:

- Four impact blocks in a 2x2 grid.
- Metric strip.
- Cost strip.
- Final line.

Text size:

- Heading: 56-64 pt.
- Impact block title: 32-38 pt.
- Impact block body: 22-28 pt.
- Metric strip: 26-34 pt.
- Cost strip: 24-30 pt.

Do not clutter this slide with:

- Full cost table.
- All safeguards.
- Full test list.

Keep it decisive.

## Demo Video Production Plan

Create one final demo video file:

```text
boldr_signaldedesk_final_demo_2m25s.mp4
```

Target runtime: 2:20-2:30.

Recommended clip sequence:

1. Answerable ticket: 40-45 seconds.
2. Knowledge gap and FAQ: 45-50 seconds.
3. Marketing intelligence: 35-40 seconds.
4. Metrics / scorecard: 10-15 seconds.

Cut out:

- Loading time.
- Repeated clicks.
- Long scrolling.
- Any UI region that is too small to read.

Add simple video callouts:

- `Persona detected`
- `Evidence found`
- `Draft waits for approval`
- `Unsupported claim blocked`
- `Human resolution added`
- `FAQ draft generated`
- `Themes become marketing signals`

Callout style:

- Black translucent rectangle.
- White text.
- One line only.
- 28-36 px.
- Keep each callout visible for at least 1.5 seconds.

Do not add background music. The room audio and live voice should remain clear.

## Screen Recording Checklist

Before recording:

1. Start backend and frontend, or use deployed app if it is stable.
2. Open the app in Chrome.
3. Set browser zoom to 90% or 100%.
4. Use 16:9 screen resolution.
5. Click `Reset demo`.
6. Confirm backend status says connected.
7. Use dark mode if it gives stronger contrast.
8. Hide unrelated browser tabs and bookmarks.
9. Increase browser font or zoom if UI text is too small on stage.

Record these exact questions:

```text
Are BOLDR FKM straps BPA-free and safe for kids?
```

```text
What luminous material do you use on the dial? Is it Super-LumiNova? Is it safe?
```

For the gap resolution, paste:

```text
BOLDR uses non-radioactive luminous material on supported watch dials and hands. If a specific model uses Super-LumiNova, the team should confirm that from the product specification before naming it. The luminous material is intended for normal watch use and should not pose a safety concern when the watch is used as designed.
```

Resolution note:

```text
Confirmed as a policy gap for the demo.
```

## Backup Plan If AV Or Video Fails

Prepare backup slides after the main 7 slides. Do not show them unless needed.

Backup Appendix A: Answerable ticket screenshot.

- Customer question.
- Trace.
- Approval queue.
- Evidence cards.

Backup Appendix B: Knowledge-gap screenshot.

- Gap question.
- Blocked answerability.
- CS queue.
- FAQ draft.

Backup Appendix C: Marketing intelligence screenshot.

- Weekly theme clusters.
- Monthly brief.
- External benchmark.

Backup Appendix D: Metrics screenshot.

- 70 tickets processed.
- About 96% answerability accuracy.
- 100% evidence coverage.
- 0 unsupported hard-claim guardrail failures.

Backup narration:

> If the video does not play, these screenshots show the same workflow states: supported answer, blocked gap, human resolution, FAQ draft, and marketing intelligence.

## What To Say In Q&A

Prepare short answers. Judges have only 3 minutes, so every answer should be 20-35 seconds.

### Q: Why is this not just a chatbot?

Answer:

> A chatbot tries to answer the customer directly. SignalDesk is an operating workflow. It retrieves evidence, decides whether the answer is supported, queues drafts for human approval, routes gaps when evidence is missing, and turns repeated questions into FAQ and marketing outputs.

### Q: What happens if the model is wrong?

Answer:

> Customer-facing actions are gated. Replies are drafts, FAQ entries are drafts, and unsupported claims are blocked. The model also sits behind a provider adapter, and tests pass without live credentials using deterministic and validated paths.

### Q: What data did you use?

Answer:

> I used the six actual local BOLDR files in the repo: customer tickets, FAQ PDF, SOP, product reference, engraving rate card, and servicing rate card. The challenge brief mentioned more files, but the actual folder had six, so the system treats those as source of truth rather than inventing missing data.

### Q: How do you handle conflicting sources?

Answer:

> Source priority is explicit. Rate cards are authoritative for pricing, limits, and turnaround. Product reference is authoritative for product facts. FAQ guides customer-facing wording. SOP guides routing and tone.

### Q: What is the business impact?

Answer:

> The team gets faster drafts for supported questions, fewer risky answers because unsupported claims are blocked, better FAQ maintenance through draft KB entries, and marketing insight from repeated customer language. The current evaluation processes 70 tickets, detects 9 themes, and generates 6 marketing opportunities.

### Q: What is the cost?

Answer:

> For a small pilot at 500 tickets per month, the estimate is roughly 37 to 75 dollars per month before sponsor credits, or about 9 to 19 cents per resolved or usefully routed enquiry. It is designed to be realistic for a small Shopify brand.

### Q: Why GLM-5.1 / FPT AI Factory?

Answer:

> The AI layer is configured for GLM-5.1 through FPT AI Factory because the workflow needs structured reasoning over retrieved evidence. But the provider is replaceable, and the safety gates do not depend on a single model.

### Q: How does the external benchmark work?

Answer:

> It compares internal BOLDR themes with curated external watch-market signals from source groups such as forums, Reddit-like communities, reviews, and editorial/review coverage. The output says whether each theme looks BOLDR-specific or market-wide, then recommends a product or marketing action.

### Q: What would you build next?

Answer:

> First, connect real Gmail intake and Shopify/order lookup. Second, persist the workflow in Postgres with pgvector. Third, turn the external benchmark into a scheduled ingestion pipeline with source validation and freshness checks.

## Q&A Proof Points To Keep Ready

Open locally or in browser before presenting:

- `SUBMISSION.md` for metrics, costs, safeguards.
- `WORKFLOW_DOCUMENTATION.md` for non-technical workflow diagrams.
- `docs/prd.md` for product and technical decisions.
- `docs/responsible-ai.md` for safety/failure-mode matrix.
- `backend/tests/` for proof of quality.
- Live deployment URLs from `SUBMISSION.md`.

If asked for proof of execution, show:

- Frontend app.
- Backend health endpoint.
- Evaluation scorecard endpoint.
- Repo structure with backend and frontend.
- Test command, if needed.

Do not run tests live unless explicitly asked and time allows. Instead say they are documented and can be run from the repo.

## Rubric Mapping

### Technical Execution - 25%

Show through:

- Working UI.
- Backend connected.
- Evidence search.
- Answerability gate.
- Approval queue.
- Gap workflow.
- FAQ draft.
- Marketing intelligence.
- Evaluation scorecard.

Say:

> The core workflow is implemented end to end, with backend APIs, frontend workbench, retrieval, classification, drafting contracts, and tests.

### SME Impact And Business Value - 25%

Show through:

- 3-person CS team pain.
- Faster drafts.
- Fewer repeated questions.
- Product-page gaps.
- Campaign signals.

Say:

> The system helps a small team respond faster while also learning what customers care about.

### Cost Efficiency - 20%

Show through:

- One-line monthly cost estimate.
- Cost per resolved/routed enquiry.
- Sponsor credits.
- Local demo can run with no incremental cost.

Say:

> This is not an enterprise-only workflow. It can start as a low-cost pilot for a small Shopify brand.

### Responsible AI - 10%

Show through:

- Unsupported claim blocked.
- Human approval gates.
- Source priority.
- Tests and guardrails.

Say:

> The system refuses to make unsupported claims and turns uncertainty into a human task.

### Presentation Quality - 20% Live Final

Achieve through:

- Large text.
- No jargon-heavy slides.
- One clear loop.
- One clean demo.
- One decisive ROI slide.
- End exactly on time.

## Main Risks And Fixes

Risk: demo video text too small on stage.

Fix:

- Crop the recording to the important panel.
- Use callouts.
- Use 90-110% browser zoom.
- Prefer screenshots for metric-heavy sections.

Risk: too much technical explanation.

Fix:

- Replace architecture details with business workflow language.
- Use "evidence gate" instead of "retrieval-augmented generation."
- Use "approval queue" instead of "human-in-the-loop orchestration."

Risk: judges think it only drafts support replies.

Fix:

- Repeat the three outcomes:
  - supported draft
  - knowledge gap / FAQ update
  - marketing signal

Risk: running over time.

Fix:

- The first minute must end at 1:00.
- The demo must end at 3:45.
- The closing must end at 5:00.
- Rehearse with a timer at least five times.

Risk: live app fails.

Fix:

- Use embedded video.
- Keep backup screenshots.
- Keep local and deployed app ready.

## Rehearsal Script With Time Checks

### Rehearsal Pass 1: Words Only

Goal: hit 4:45 without slides.

Rules:

- Speak the voiceover from this plan.
- Time each section.
- Cut any sentence that feels like explaining implementation internals.

### Rehearsal Pass 2: Slides + Voice

Goal: hit 4:55.

Rules:

- Use the actual deck.
- Practice transitions.
- Do not improvise during the demo.

### Rehearsal Pass 3: Stage Simulation

Goal: hit 4:50-4:58.

Rules:

- Stand up.
- Use microphone or similar distance from laptop.
- Use presenter notes only as memory anchors.
- End on the exact final line.

### Rehearsal Pass 4: Failure Mode

Goal: remain clear if video does not play.

Rules:

- Present using backup screenshots only.
- Keep the same story and timing.
- Do not apologize at length; say "I will use the backup screenshots."

## Final Deck Checklist

Main slides:

- [ ] Slide 1: Title / one-line promise.
- [ ] Slide 2: Origin and pain point.
- [ ] Slide 3: Workflow map.
- [ ] Slide 4: Answerable ticket demo.
- [ ] Slide 5: Gap and FAQ demo.
- [ ] Slide 6: Marketing intelligence demo.
- [ ] Slide 7: ROI / impact.

Backup slides:

- [ ] Answerable ticket screenshot.
- [ ] Gap workflow screenshot.
- [ ] FAQ draft screenshot.
- [ ] Marketing intelligence screenshot.
- [ ] Metrics / scorecard screenshot.
- [ ] Cost table screenshot from `SUBMISSION.md`.
- [ ] Architecture proof screenshot or repo structure.

Files:

- [ ] Presentation deck.
- [ ] PDF export.
- [ ] Embedded demo video.
- [ ] Standalone demo video.
- [ ] Backup screenshots.
- [ ] Local app ready.
- [ ] Deployed app link ready.

## Final 30-Second Memory Version

If nerves hit, remember this structure:

```text
Problem:
BOLDR answers emails but loses the intelligence.

Workflow:
SignalDesk checks evidence, drafts only when supported, routes gaps when not, and creates FAQ updates.

Business value:
Faster support, safer answers, better KB, and marketing signals from real customer language.
```

End with:

```text
BOLDR does not just answer customers faster. It learns from what customers keep asking.
```
