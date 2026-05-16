from __future__ import annotations

import re
from collections import Counter

from app.models.ai import DraftReplyOutput, EvidenceSufficiencyOutput, GapRecordOutput, ReplyType
from app.models.classification import TicketClassification
from app.models.drafting import (
    AnswerabilityDecision,
    DraftApproval,
    DraftEvaluation,
    EvidenceTrace,
    GuardrailCheck,
    TicketDraft,
)
from app.models.retrieval import EvidenceCard, RetrievalResult

BANNED_REPLY_PATTERNS = [
    "Dear Sir/Madam",
    "Great question!",
    "I can confirm your order",
    "your package is delayed",
]


def generate_ticket_draft(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> TicketDraft:
    evidence_trace = [
        EvidenceTrace(
            evidence_id=evidence.evidence_id,
            source_file=evidence.source_file,
            source_type=evidence.source_type,
            section_title=evidence.section_title,
            excerpt=evidence.excerpt,
            supports_answer=evidence.supports_answer,
        )
        for evidence in retrieval.evidence
    ]
    evidence_sufficiency = judge_evidence_sufficiency(classification, retrieval)
    decision = decide_reply_type(classification, retrieval, evidence_sufficiency)
    draft = build_draft_output(classification, retrieval, decision)
    gap_record = build_gap_record(classification, retrieval, decision)
    guardrails = run_guardrails(classification, retrieval, decision, draft)

    approval_status = "draft" if decision.can_send_to_customer else "needs_review"
    if any(not guardrail.passed for guardrail in guardrails):
        approval_status = "needs_review"

    return TicketDraft(
        ticket_id=classification.ticket_id,
        persona=classification.persona,
        intent=classification.intent,
        decision=decision,
        evidence_sufficiency=evidence_sufficiency,
        draft=draft,
        gap_record=gap_record,
        evidence_trace=evidence_trace,
        guardrails=guardrails,
        approval=DraftApproval(status=approval_status),
    )


def evaluate_drafts(drafts: list[TicketDraft]) -> DraftEvaluation:
    reply_counts = Counter(draft.decision.reply_type for draft in drafts)
    approval_counts = Counter(draft.approval.status for draft in drafts)
    return DraftEvaluation(
        total_tickets=len(drafts),
        generated_ticket_count=len(drafts),
        customer_reply_count=reply_counts["customer_reply"],
        holding_reply_count=reply_counts["holding_reply"],
        internal_note_count=reply_counts["internal_note"],
        answerable_draft_count=sum(
            1
            for draft in drafts
            if draft.decision.answerability == "answerable"
            and draft.decision.reply_type == "customer_reply"
        ),
        blocked_unsupported_count=sum(
            1 for draft in drafts if draft.decision.unsupported_terms
        ),
        order_lookup_note_count=sum(
            1
            for draft in drafts
            if draft.decision.answerability == "order_lookup_required"
            and draft.decision.reply_type == "internal_note"
        ),
        guardrail_failures_count=sum(
            1
            for draft in drafts
            for guardrail in draft.guardrails
            if not guardrail.passed
        ),
        evidence_backed_customer_reply_count=sum(
            1
            for draft in drafts
            if draft.decision.reply_type == "customer_reply"
            and bool(draft.draft.evidence_ids)
            and bool(draft.draft.claims)
        ),
        approval_status_counts=dict(approval_counts),
    )


def judge_evidence_sufficiency(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> EvidenceSufficiencyOutput:
    required_inputs: list[str] = []
    if classification.answerability == "order_lookup_required":
        required_inputs.append("Check Shopify, carrier, refund, or order system before replying.")
    if classification.answerability == "needs_human_review":
        required_inputs.append("Human review is required before any customer-facing answer.")
    if retrieval.unsupported_terms:
        required_inputs.append("Resolve unsupported knowledge themes before making a claim.")

    sufficient = (
        classification.answerability == "answerable"
        and retrieval.sufficient_evidence
        and not retrieval.unsupported_terms
        and bool(retrieval.evidence)
    )

    supported_claims = []
    if sufficient:
        supported_claims = infer_supported_claims(classification, retrieval)

    unsupported_claims = [
        f"Do not claim support for {term}." for term in retrieval.unsupported_terms
    ]

    return EvidenceSufficiencyOutput(
        ticket_id=classification.ticket_id,
        sufficient_evidence=sufficient,
        confidence=0.92 if sufficient else 0.18,
        supported_claims=supported_claims,
        unsupported_claims=unsupported_claims,
        required_human_inputs=required_inputs,
        rationale=(
            "Deterministic answerability and retrieval evidence agree."
            if sufficient
            else "The ticket is blocked by answerability rules, missing evidence, or unsupported terms."
        ),
    )


def decide_reply_type(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    sufficiency: EvidenceSufficiencyOutput,
) -> AnswerabilityDecision:
    reasons = [classification.routing_reason]
    required_inputs = list(sufficiency.required_human_inputs)

    if classification.answerability == "answerable" and sufficiency.sufficient_evidence:
        return AnswerabilityDecision(
            ticket_id=classification.ticket_id,
            answerability=classification.answerability,
            reply_type="customer_reply",
            customer_facing=True,
            can_send_to_customer=True,
            evidence_sufficient=True,
            judge_method="deterministic_rules_plus_retrieval_plus_schema_contract",
            reasons=["Static KB evidence is sufficient for a grounded draft."],
            required_human_inputs=[],
            unsupported_terms=[],
        )

    if classification.answerability == "order_lookup_required":
        return AnswerabilityDecision(
            ticket_id=classification.ticket_id,
            answerability=classification.answerability,
            reply_type="internal_note",
            customer_facing=False,
            can_send_to_customer=False,
            evidence_sufficient=False,
            judge_method="deterministic_rules_plus_retrieval_plus_schema_contract",
            reasons=[*reasons, "Order-specific status cannot be answered from static KB."],
            required_human_inputs=required_inputs,
            unsupported_terms=retrieval.unsupported_terms,
        )

    if classification.answerability == "knowledge_gap" or retrieval.unsupported_terms:
        return AnswerabilityDecision(
            ticket_id=classification.ticket_id,
            answerability=classification.answerability,
            reply_type="holding_reply",
            customer_facing=True,
            can_send_to_customer=False,
            evidence_sufficient=False,
            judge_method="deterministic_rules_plus_retrieval_plus_schema_contract",
            reasons=[*reasons, "Question matches a gap or unsupported local theme."],
            required_human_inputs=required_inputs,
            unsupported_terms=retrieval.unsupported_terms,
        )

    return AnswerabilityDecision(
        ticket_id=classification.ticket_id,
        answerability=classification.answerability,
        reply_type="internal_note",
        customer_facing=False,
        can_send_to_customer=False,
        evidence_sufficient=False,
        judge_method="deterministic_rules_plus_retrieval_plus_schema_contract",
        reasons=[*reasons, "Human review is required before drafting a customer reply."],
        required_human_inputs=required_inputs,
        unsupported_terms=retrieval.unsupported_terms,
    )


def build_draft_output(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    decision: AnswerabilityDecision,
) -> DraftReplyOutput:
    evidence_ids = [
        evidence.evidence_id for evidence in retrieval.evidence if evidence.supports_answer
    ][:6]
    claims = infer_supported_claims(classification, retrieval) if decision.can_send_to_customer else []

    if decision.reply_type == "customer_reply":
        reply = compose_customer_reply(classification, retrieval)
        return DraftReplyOutput(
            ticket_id=classification.ticket_id,
            reply_type="customer_reply",
            draft_reply=reply,
            evidence_ids=evidence_ids,
            claims=claims,
            approval_status="draft",
        )

    if decision.reply_type == "holding_reply":
        unsupported = ", ".join(decision.unsupported_terms) or "this detail"
        reply = (
            "Thanks for checking with us. I do not want to confirm a detail we have not "
            f"validated yet, especially around {unsupported}. I have flagged this for the "
            "team to confirm and update our knowledge base before we give you a definitive answer."
        )
        return DraftReplyOutput(
            ticket_id=classification.ticket_id,
            reply_type="holding_reply",
            draft_reply=reply,
            evidence_ids=[],
            claims=[],
            approval_status="needs_review",
        )

    note = compose_internal_note(classification, decision)
    return DraftReplyOutput(
        ticket_id=classification.ticket_id,
        reply_type="internal_note",
        draft_reply=note,
        evidence_ids=evidence_ids,
        claims=[],
        approval_status="needs_review",
    )


def compose_customer_reply(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> str:
    text = classification.normalized_question
    if "bpa" in text:
        return (
            "Yes. For the current range, BOLDR's FKM rubber and nylon NATO straps are "
            "BPA-free. The product reference also marks current strap SKUs as BPA-free. "
            "For a child or sensitive skin, FKM rubber or nylon is the safer recommendation; "
            "leather is BPA-free but not treated as hypoallergenic."
        )
    if "caseback" in text and ("engraving" in text or "engrave" in text):
        return (
            "Yes, we can engrave the caseback. The standard caseback engraving rate is "
            "SGD 25 for up to 20 characters and SGD 40 for 21 to 40 characters. The "
            "maximum is 60 characters, with additional characters beyond 40 charged at "
            "SGD 1.50 each. Non-Latin scripts have separate per-character pricing, so we "
            "should confirm the exact text before final production."
        )
    if "full service" in text:
        return (
            "Full Service - Standard costs SGD 160 and normally takes 14-21 days. It "
            "includes full movement disassembly, ultrasonic cleaning, lubrication, "
            "regulation, a 100m water-resistance test, light case polish, and new gaskets. "
            "For a watch running slightly slow, the regulation step is directly relevant."
        )
    if "regulation service" in text or "losing" in text:
        return (
            "Yes. A regulation service is designed for an automatic watch that is running "
            "fast or slow. The rate card lists it at SGD 85 with a 7-10 day turnaround, "
            "including movement cleaning, regulation to +/-5 seconds per day, and a timing "
            "machine report."
        )
    if "expedition" in text and "journey" in text and ("difference" in text or "differences" in text):
        return (
            "The Expedition is the more technical choice: Grade 5 titanium, Miyota 9015 "
            "automatic movement, 100m water resistance, and an FKM rubber strap. The Journey "
            "is lighter and more minimalist, using Grade 2 titanium, a Miyota 9039 automatic "
            "movement, 50m water resistance, and a nylon NATO strap. If you want the more "
            "rugged everyday field watch, choose Expedition; if you want the cleaner daily "
            "wear option, choose Journey."
        )
    if "swap straps" in text or "lug width" in text or "nato" in text or "quick-release" in text:
        return (
            "Yes. Current Expedition and Journey models use a standard 20mm lug width, so "
            "20mm straps can be swapped between them. Standard 20mm NATO straps are also "
            "compatible, and current BOLDR straps use quick-release spring bars."
        )
    if "return policy" in text or "return the watch" in text:
        return (
            "We accept returns within 14 days of delivery for unworn, unmodified items in "
            "their original packaging. Engraved items are not returnable unless there is a "
            "manufacturing defect."
        )
    if "grade" in text and "titanium" in text:
        return (
            "The Expedition uses Grade 5 Titanium, also listed as Ti-6Al-4V. The Journey "
            "uses Grade 2 titanium, so the two models use different titanium grades."
        )

    best_evidence = first_supporting_evidence(retrieval)
    excerpt = best_evidence.excerpt if best_evidence else "the current knowledge base"
    return (
        "Based on the current BOLDR knowledge base, this is answerable from our local "
        f"sources: {excerpt}"
    )


def compose_internal_note(
    classification: TicketClassification,
    decision: AnswerabilityDecision,
) -> str:
    if classification.answerability == "order_lookup_required":
        identifiers = [*classification.extracted_order_ids, *classification.extracted_tracking_ids]
        identifier_text = ", ".join(identifiers) if identifiers else "the customer/order details"
        return (
            f"Internal action: check Shopify, carrier, refund, or fulfilment systems for {identifier_text}. "
            "Do not state any delivery, refund, cancellation, or resolution outcome until live order data confirms it."
        )
    return (
        "Internal action: route this ticket to a human reviewer before any customer-facing reply. "
        + " ".join(decision.required_human_inputs)
    ).strip()


def build_gap_record(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    decision: AnswerabilityDecision,
) -> GapRecordOutput | None:
    if decision.reply_type != "holding_reply":
        return None
    theme = retrieval.unsupported_terms[0] if retrieval.unsupported_terms else classification.intent
    owner = "Operations"
    if "sustainability_signal" in classification.operational_tags or "carbon" in theme or "recycling" in theme:
        owner = "Marketing / Operations"
    if "mri" in theme.lower() or "magnetic" in theme.lower():
        owner = "Product / Technical"
    return GapRecordOutput(
        ticket_id=classification.ticket_id,
        gap_theme=theme,
        gap_question=classification.question_text,
        owner=owner,
        priority="high" if classification.persona == "Sustainability Advocate" else "medium",
        evidence_summary=retrieval.insufficiency_reason
        or "No local evidence supports a definitive answer.",
        suggested_next_action=(
            "Assign an owner to confirm the policy or product fact, then create a FAQ draft "
            "before customer-facing claims are allowed."
        ),
    )


def infer_supported_claims(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> list[str]:
    text = classification.normalized_question
    if "bpa" in text:
        return [
            "Current FKM rubber and nylon NATO straps are BPA-free.",
            "Leather is BPA-free but not treated as hypoallergenic.",
        ]
    if "caseback" in text and ("engraving" in text or "engrave" in text):
        return [
            "Caseback engraving up to 20 characters costs SGD 25.",
            "Caseback engraving from 21 to 40 characters costs SGD 40.",
            "The maximum caseback engraving length is 60 characters.",
        ]
    if "full service" in text:
        return [
            "Full Service - Standard costs SGD 160.",
            "Full Service - Standard takes 14-21 days.",
            "Full Service - Standard includes movement disassembly, cleaning, lubrication, regulation, water-resistance test, light polish, and new gaskets.",
        ]
    if "regulation service" in text or "losing" in text:
        return [
            "Regulation Service costs SGD 85.",
            "Regulation Service takes 7-10 days.",
            "Regulation Service includes regulation to +/-5 seconds per day and a timing machine report.",
        ]
    if "expedition" in text and "journey" in text and ("difference" in text or "differences" in text):
        return [
            "Expedition uses Grade 5 titanium and 100m water resistance.",
            "Journey uses Grade 2 titanium and 50m water resistance.",
        ]
    if "swap straps" in text or "lug width" in text or "nato" in text or "quick-release" in text:
        return [
            "Current Expedition and Journey models use 20mm lug width.",
            "Standard 20mm NATO straps are compatible.",
            "Current BOLDR straps use quick-release spring bars.",
        ]
    if "return policy" in text or "return the watch" in text:
        return [
            "Returns are accepted within 14 days of delivery for unworn, unmodified items in original packaging.",
            "Engraved items are not returnable unless there is a manufacturing defect.",
        ]
    if "grade" in text and "titanium" in text:
        return ["Expedition uses Grade 5 Titanium; Journey uses Grade 2 titanium."]
    return [
        f"Answer is supported by {evidence.source_file}."
        for evidence in retrieval.evidence[:2]
        if evidence.supports_answer
    ]


def run_guardrails(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    decision: AnswerabilityDecision,
    draft: DraftReplyOutput,
) -> list[GuardrailCheck]:
    text = draft.draft_reply
    banned = [pattern for pattern in BANNED_REPLY_PATTERNS if pattern.lower() in text.lower()]
    customer_claims_have_evidence = (
        not decision.customer_facing
        or not draft.claims
        or bool(draft.evidence_ids)
    )
    unsupported_claim_terms = [
        term
        for term in retrieval.unsupported_terms
        if term.lower() in text.lower() and decision.reply_type == "customer_reply"
    ]
    order_status_claim = (
        decision.customer_facing
        and classification.answerability == "order_lookup_required"
        and bool(re.search(r"\b(delayed|delivered|refunded|cancelled|shipped)\b", text, re.I))
    )

    return [
        GuardrailCheck(
            name="banned_tone_patterns",
            passed=not banned,
            message="No banned generic or overconfident phrases found."
            if not banned
            else f"Banned phrases found: {', '.join(banned)}",
        ),
        GuardrailCheck(
            name="customer_claims_have_evidence",
            passed=customer_claims_have_evidence,
            message="Customer-facing claims are tied to evidence IDs."
            if customer_claims_have_evidence
            else "Customer-facing claims need evidence IDs.",
        ),
        GuardrailCheck(
            name="unsupported_terms_not_claimed",
            passed=not unsupported_claim_terms,
            message="Unsupported themes are not claimed as facts."
            if not unsupported_claim_terms
            else f"Unsupported terms claimed: {', '.join(unsupported_claim_terms)}",
        ),
        GuardrailCheck(
            name="order_status_not_invented",
            passed=not order_status_claim,
            message="Order-specific status is not invented from static KB."
            if not order_status_claim
            else "Order-specific status claim found.",
        ),
    ]


def first_supporting_evidence(retrieval: RetrievalResult) -> EvidenceCard | None:
    return next((evidence for evidence in retrieval.evidence if evidence.supports_answer), None)
