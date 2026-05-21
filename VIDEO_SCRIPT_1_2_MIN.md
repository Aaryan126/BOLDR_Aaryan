# BOLDR SignalDesk 1-2 Minute Demo Script

Target runtime: 1:40-1:58. Record this as a fresh walkthrough focused on the product in action.

## Goal

Show judges that SignalDesk works end to end:

1. A customer asks a question.
2. The system classifies, retrieves evidence, and drafts a reply.
3. A human approval gate controls the response.
4. Unsupported questions become CS knowledge gaps instead of hallucinated answers.
5. Resolved gaps become draft FAQ updates.
6. Repeated support patterns become marketing and product insights.

## Recording Prep

1. Open the live app or local app.
2. Click `Reset demo` in `Customer Chat`.
3. Confirm the top-right status says `Backend connected`.
4. Keep browser zoom at 90% or 100%.
5. Use jump cuts after loading or processing waits.

## Clip 1: Start With The Product

Target length: 0:00-0:10.

Screen actions:

1. Start on `Customer Chat`.
2. Show the empty question box and `Backend connected`.

Voiceover:

"This is BOLDR SignalDesk, a support intelligence workflow for a small watch e-commerce team. I’ll show it handling a customer question, blocking an unsupported claim, and turning support patterns into business insight."

## Clip 2: Answerable Customer Question

Target length: 0:10-0:45.

Screen actions:

1. Paste this into `Customer Chat`:
   ```text
   Are BOLDR FKM straps BPA-free and safe for kids?
   ```
2. Click `Send`.
3. Jump cut to the completed processing trace.
4. Show the trace steps:
   - persona and intent classification
   - knowledge-base search
   - answerability check
   - draft generation
5. Open `Approvals`.
6. Show the draft reply and evidence cards.

Voiceover:

"For an answerable question, SignalDesk identifies the intent and buyer persona, searches BOLDR’s local FAQ, product reference, SOP, and rate-card sources, then checks whether the answer is actually supported. Here the system drafts a response with evidence, but it does not send it automatically. The reply waits in Approvals, where a human can approve, edit, or reject it."

## Clip 3: Unsupported Claim Becomes A CS Gap

Target length: 0:45-1:12.

Screen actions:

1. Return to `Customer Chat`.
2. Paste this question:
   ```text
   Do you offer carbon-neutral shipping or a strap recycling take-back program?
   ```
3. Click `Send`.
4. Jump cut to the completed trace.
5. Show the blocked answerability or routed-to-CS state.
6. Open `CS Queue`.
7. Show the gap details: attempted evidence, priority, owner, and next action.

Voiceover:

"Now here is the safer behavior. Carbon-neutral shipping and strap recycling are not fully supported by the current source data, so SignalDesk does not invent an answer. It creates a CS gap with the missing knowledge, attempted evidence, priority, owner, and next action."

## Clip 4: Human Resolution To FAQ Draft

Target length: 1:12-1:28.

Screen actions:

1. In `CS Queue`, paste this verified resolution:
   ```text
   BOLDR is not currently claiming carbon-neutral shipping or a strap recycling take-back program. We use recyclable packaging where available and are assessing carrier offset and strap take-back options.
   ```
2. In `Resolution Note`, paste:
   ```text
   Confirmed as a policy gap for the demo.
   ```
3. Click `Resolve Gap`.
4. Click `Draft KB Entry`.
5. Show the generated KB draft.

Voiceover:

"After a human adds a verified resolution, the workflow drafts a new FAQ entry for review. That means unresolved support work becomes structured knowledge-base improvement without removing human control."

## Clip 5: Marketing And Product Insight

Target length: 1:28-1:43.

Screen actions:

1. Open `Marketing Intel`.
2. Show the top summary metrics.
3. Briefly show:
   - `Monthly Brief`
   - `Weekly Theme Clustering`
   - `Bonus External Benchmark`

Voiceover:

"The same ticket data becomes product and marketing intelligence. SignalDesk clusters repeated questions, highlights product-page gaps, creates monthly marketing opportunities, and compares internal themes against curated external watch-market signals."

## Clip 6: Closing Summary

Target length: 1:43-1:58.

Screen actions:

1. End on `Marketing Intel`, `System Details`, or return to `Customer Chat`.
2. Keep a stable screen visible while the voiceover finishes.

Voiceover:

"So the core product is one connected loop: evidence-backed support replies, human approval, no-hallucination gap handling, FAQ improvement, and marketing insight. That makes it useful for a small BOLDR team because every ticket can improve the next answer, the next product page, and the next campaign."

## One-Take Voiceover

Use this if recording narration separately:

"This is BOLDR SignalDesk, a support intelligence workflow for a small watch e-commerce team. I’ll show it handling a customer question, blocking an unsupported claim, and turning support patterns into business insight.

For an answerable question, SignalDesk identifies the intent and buyer persona, searches BOLDR’s local FAQ, product reference, SOP, and rate-card sources, then checks whether the answer is actually supported. Here the system drafts a response with evidence, but it does not send it automatically. The reply waits in Approvals, where a human can approve, edit, or reject it.

Now here is the safer behavior. Carbon-neutral shipping and strap recycling are not fully supported by the current source data, so SignalDesk does not invent an answer. It creates a CS gap with the missing knowledge, attempted evidence, priority, owner, and next action.

After a human adds a verified resolution, the workflow drafts a new FAQ entry for review. That means unresolved support work becomes structured knowledge-base improvement without removing human control.

The same ticket data becomes product and marketing intelligence. SignalDesk clusters repeated questions, highlights product-page gaps, creates monthly marketing opportunities, and compares internal themes against curated external watch-market signals.

So the core product is one connected loop: evidence-backed support replies, human approval, no-hallucination gap handling, FAQ improvement, and marketing insight. That makes it useful for a small BOLDR team because every ticket can improve the next answer, the next product page, and the next campaign."

## Timing Rules

- Keep the UI moving. Judges asked for a walkthrough of the product in action.
- Cut dead time after `Send`, `Resolve Gap`, and `Draft KB Entry`.
- Do not show code, cloud dashboards, private credentials, or implementation files.
- If the video is too long, trim Marketing Intel first, then shorten the FAQ draft section.
- If the video is too short, hold longer on the evidence cards and CS gap details.
