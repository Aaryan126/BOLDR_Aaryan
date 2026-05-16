# Sample Dataset Guide

This guide documents the actual sample dataset available in this repository. The challenge brief says 11 files are provided, but this repo currently contains 6 dataset files under `Boldr Data/`. Use these 6 files as the source of truth.

## Available Files

### `Boldr Data/01_customer_tickets.csv`

Primary input dataset.

Contains 70 anonymized customer enquiries with fields such as:

- `ticket_id`
- `date_received`
- `customer_name`
- `customer_email`
- `order_id`
- `channel`
- `question_type`
- `subject`
- `message_body`
- `status`
- `answered_by_kb`
- `requires_escalation`
- `buyer_persona`
- `agent_notes`

Observed structure:

- 7 question types, 10 tickets each:
  - `knowledge_gap`
  - `servicing`
  - `product_general`
  - `materials_safety`
  - `strap_compatibility`
  - `order_status`
  - `engraving`
- 50 tickets are marked `answered_by_kb=yes`.
- 20 tickets are marked `answered_by_kb=no`.
- `knowledge_gap` and `order_status` tickets are marked as not answerable by KB and require escalation.
- CSV buyer persona labels do not match the five required personas from the brief image. Map them into the five required personas documented in `docs/personas.md`.

How to use it:

- Batch-process it as the simulated inbox.
- Use labels for evaluation, not as the only source of truth.
- Separate true knowledge gaps from order-specific tasks that require Shopify lookup.
- Use `subject` plus `message_body` as the customer enquiry text.

### `Boldr Data/03a_rate_card_engraving.csv`

Authoritative structured source for engraving pricing and constraints.

Contains:

- caseback engraving prices
- character count tiers
- CJK and Arabic script pricing
- strap buckle engraving
- logo/symbol engraving requirements
- multi-line engraving
- rush engraving
- correction rules

Use this file for:

- engraving prices
- script support
- character limits
- rush/correction policy
- custom logo requirements

If this file conflicts with the SOP or FAQ on price or limits, prefer this file.

### `Boldr Data/03b_rate_card_servicing.csv`

Authoritative structured source for servicing pricing, turnaround, and included work.

Contains:

- battery replacement
- regulation service
- full service standard
- full service premium
- crystal replacement
- case and bracelet polish
- strap/bracelet fitting
- water resistance re-test
- international service surcharge
- service warranty extension

Use this file for:

- servicing prices
- turnaround times
- warranty extension details
- included servicing scope

If this file conflicts with the SOP or FAQ on price or turnaround, prefer this file.

### `Boldr Data/04_faq_document.pdf`

Primary natural-language knowledge base.

Sections:

- Materials & Safety
- Engraving
- Strap Compatibility
- Watch Servicing
- Orders & Shipping
- General

Use this file for:

- existing customer-facing FAQ answers
- phrasing patterns for generated FAQ entries
- answer support when the FAQ directly covers a question

Important notes:

- The actual PDF currently contains 32 FAQ entries across six sections.
- The FAQ is customer-facing and useful for tone.
- It may summarize details that are more precisely represented in rate cards or product reference files.
- For pricing and hard constraints, verify against the structured CSVs.

### `Boldr Data/05a_SOP.docx`

Internal customer service process document.

Contains:

- current manual CS workflow
- reference document list
- enquiry handling steps
- common enquiry types
- escalation rules
- new questions log process
- tone and brand voice
- internal contact routing

Use this file for:

- support workflow logic
- escalation conditions
- reply tone guidance
- human approval gates
- internal routing contacts
- how to handle new questions

Do not treat SOP prices as authoritative if they conflict with the rate cards.

### `Boldr Data/05b_product_reference.docx`

Authoritative product and strap reference.

Contains:

- current watch models
- SKUs
- prices
- case specs
- movement specs
- water resistance
- lume
- weight
- dial colors
- strap options
- lug width
- safety claims
- warranty
- availability
- strap catalogue
- quick answers

Use this file for:

- product specs
- model comparisons
- strap compatibility
- safety claims
- availability
- SKU-level reference

## Source Priority

When sources conflict, use this order:

1. Rate card CSVs for prices, limits, and turnaround times.
2. Product reference for specs, SKUs, safety claims, compatibility, and availability.
3. FAQ for customer-facing wording and existing FAQ coverage.
4. SOP for process, routing, escalation, approval, and tone.
5. Ticket labels for evaluation and examples, not as authoritative product knowledge.

## Known Mismatches And Caveats

- The brief says there are 11 files, but only 6 are present.
- The brief says five personas, while the ticket CSV contains seven internal persona labels.
- The SOP contains some pricing and turnaround details that differ from the rate cards.
- Some tickets marked as historical knowledge gaps may now be answerable from the current FAQ or rate cards.
- Order-status tickets require Shopify or order-system lookup. They should not be answered from the static KB alone.

## Generated Artifacts To Create Later

The missing files from the brief can become generated project outputs:

- knowledge gap log
- buyer persona mapping table
- routing/decision tree
- weekly theme clusters
- monthly marketing brief
- external sentiment benchmarking dataset for the bonus challenge
