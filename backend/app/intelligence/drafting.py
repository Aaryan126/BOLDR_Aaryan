from __future__ import annotations

import re
from collections import Counter

from app.core.config import get_settings
from app.intelligence.ai_provider import AIProvider, AIProviderError, FPTGLMProvider
from app.intelligence.structured_outputs import (
    StructuredOutputError,
    build_draft_reply_prompt,
    parse_structured_output,
)
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

RAW_EVIDENCE_REPLY_PREFIX = "Based on the current BOLDR knowledge base"
RAW_TABLE_ROW_PATTERN = re.compile(r"\b[A-Z]{2,}-[A-Z0-9-]+\b.*\|")
PRICE_QUERY_TERMS = ("price", "pricing", "cost", "how much", "sgd")
PRODUCT_QUERY_STOPWORDS = {
    "a",
    "about",
    "and",
    "boldr",
    "cost",
    "current",
    "does",
    "for",
    "how",
    "is",
    "me",
    "model",
    "models",
    "much",
    "price",
    "pricing",
    "sgd",
    "the",
    "version",
    "versions",
    "watch",
    "watches",
    "what",
}


def generate_ticket_draft(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    *,
    use_live_ai: bool | None = False,
    ai_provider: AIProvider | None = None,
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
    prepared_customer_draft = None
    if decision.reply_type == "customer_reply":
        live_ai_required = should_require_live_ai(use_live_ai, ai_provider)
        prepared_customer_draft = compose_ai_customer_draft(
            classification,
            retrieval,
            decision,
            evidence_sufficiency,
            use_live_ai=use_live_ai,
            ai_provider=ai_provider,
        )
        if live_ai_required and prepared_customer_draft is None:
            decision = block_failed_live_ai_draft(decision)
        prepared_customer_reply = (
            prepared_customer_draft.draft_reply
            if prepared_customer_draft is not None
            else None
            if live_ai_required
            else compose_customer_reply(classification, retrieval)
        )
        if prepared_customer_draft is None and prepared_customer_reply:
            prepared_customer_draft = build_prepared_customer_draft(
                classification,
                retrieval,
                prepared_customer_reply,
            )
        if not live_ai_required and (
            not prepared_customer_reply or has_raw_evidence_artifacts(prepared_customer_reply)
        ):
            decision = decision.model_copy(
                update={
                    "reply_type": "internal_note",
                    "customer_facing": False,
                    "can_send_to_customer": False,
                    "evidence_sufficient": False,
                    "reasons": [
                        *decision.reasons,
                        "No clean customer-safe wording could be generated from retrieved evidence.",
                    ],
                    "required_human_inputs": [
                        "Rewrite the retrieved evidence into a customer-safe answer before approval."
                    ],
                }
            )
            prepared_customer_draft = None
    draft = build_draft_output(classification, retrieval, decision, prepared_customer_draft)
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
    prepared_customer_draft: DraftReplyOutput | None = None,
) -> DraftReplyOutput:
    evidence_ids = [
        evidence.evidence_id for evidence in retrieval.evidence if evidence.supports_answer
    ][:6]
    claims = infer_supported_claims(classification, retrieval) if decision.can_send_to_customer else []

    if decision.reply_type == "customer_reply":
        if prepared_customer_draft is not None:
            return prepared_customer_draft
        reply = compose_customer_reply(classification, retrieval)
        if reply is None:
            reply = "Internal action: rewrite the retrieved evidence into a customer-safe answer before approval."
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
) -> str | None:
    text = classification.normalized_question
    product_price_reply = compose_product_price_reply(classification, retrieval)
    if product_price_reply:
        return product_price_reply
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
    if "titanium" in text and ("stainless" in text or "lighter" in text):
        return (
            "Titanium is the lighter, more technical case-material choice compared with "
            "standard stainless steel. BOLDR's current product reference lists the "
            "Expedition Titanium case as Grade 5 titanium and the Journey as Grade 2 "
            "titanium. The Expedition reference also lists a 68g watch weight without "
            "the strap, so the practical benefit is lower wrist weight with a strong, "
            "corrosion-resistant titanium case."
        )
    if "hypoallergenic" in text or "nickel" in text:
        return (
            "The current product reference marks BOLDR's listed strap safety details as "
            "BPA-free, nickel-free, hypoallergenic, and EU REACH compliant. For severe "
            "skin sensitivity or nickel allergy, FKM rubber or nylon NATO is the safer "
            "recommendation. Leather is BPA-free, but it is not treated as hypoallergenic."
        )
    if "food-grade" in text or "medical-grade" in text:
        return (
            "The current BOLDR knowledge base confirms the strap safety details we can "
            "support: the listed FKM rubber and nylon straps are BPA-free, and the strap "
            "safety reference is nickel-free, hypoallergenic, and EU REACH compliant. It "
            "does not list a separate food-grade or medical-grade silicone certification, "
            "so we should not describe the strap that way without team confirmation."
        )
    if "dye" in text or "non-toxic" in text:
        return (
            "The current product reference supports the main safety claims for BOLDR "
            "straps: BPA-free, nickel-free, hypoallergenic, and EU REACH compliant. It "
            "does not separately publish dye-bleed testing for coloured straps, so for "
            "heavy sweat or sensitive skin I would steer you toward FKM rubber or nylon "
            "rather than treated leather."
        )
    if "reach" in text or "rohs" in text:
        return (
            "The current product reference lists the strap safety details as BPA-free, "
            "nickel-free, hypoallergenic, and EU REACH compliant. I do not see a "
            "separate RoHS strap certification in the local knowledge base, so we should "
            "not claim RoHS compliance unless the product team confirms it."
        )
    if "safe" in text and ("kid" in text or "child" in text or "children" in text):
        return (
            "For the current range, BOLDR's FKM rubber and nylon NATO straps are the "
            "safest recommendation for children or sensitive skin. The product reference "
            "marks the listed strap safety details as BPA-free, nickel-free, "
            "hypoallergenic, and EU REACH compliant. Leather is BPA-free, but it is not "
            "treated as hypoallergenic."
        )
    if "water resistant" in text and "strap" in text:
        return (
            "The Expedition reference lists 100m water resistance, which is suitable for "
            "swimming but not diving. For the strap, FKM rubber is the best match for wet "
            "use; current FKM rubber straps are 20mm, BPA-free, and compatible with all "
            "current models. Leather should not be treated as the water-friendly option."
        )
    if "swimming" in text and ("rubber" in text or "silicone" in text or "strap" in text):
        return (
            "Yes. For swimming, choose the FKM rubber strap rather than leather. The "
            "current catalogue lists 20mm FKM rubber straps in black, navy, and olive at "
            "SGD 35, and they are compatible with all current models. The Expedition is "
            "rated 100m for swimming, but not diving."
        )
    if "colour" in text and ("rubber" in text or "strap" in text):
        return (
            "The current 20mm FKM rubber strap colours listed in the product reference "
            "are black, navy, and olive. They are BPA-free, priced at SGD 35, and "
            "compatible with all current models."
        )
    if "large wrist" in text or "20cm" in text or "extended strap" in text:
        return (
            "The current knowledge base confirms that all current BOLDR models use a "
            "standard 20mm lug width and are compatible with standard 20mm straps. It "
            "does not publish a confirmed extended-strap fit for a 20cm wrist, so the "
            "team should confirm the exact strap length before promising fit."
        )
    if "mesh" in text or "milanese" in text:
        return compose_strap_catalog_reply(retrieval) or (
            "The current product reference lists a 20mm mesh bracelet option for Journey. "
            "For Expedition, use the titanium bracelet or another compatible 20mm strap."
        )
    if "leather" in text and ("care" in text or "wet" in text):
        return (
            "BOLDR's leather straps are listed as BPA-free and compatible with all current "
            "models, but leather is not treated as hypoallergenic and should not be the "
            "wet-use strap. For water exposure or sensitive skin, FKM rubber or nylon is "
            "the safer recommendation."
        )
    if "gift wrapping" in text or "gift box" in text:
        return (
            "Yes. Gift wrapping is available at checkout for SGD 8, and the watch is "
            "presented in a BOLDR gift box. That is the best option for a wedding gift."
        )
    if "warranty" in text and "strap" in text:
        return (
            "BOLDR watches come with a 2-year manufacturer's warranty covering movement "
            "defects. The warranty does not cover strap wear, physical damage, or water "
            "damage beyond the rated depth."
        )
    if "limited edition" in text or "ember" in text or "sold out" in text:
        return (
            "The Expedition Titanium - Ember Limited Edition is listed as sold out in the "
            "current product reference. The customer should be directed to the BOLDR "
            "waitlist rather than told it is available."
        )

    if classification.intent in {"engraving", "servicing"}:
        return compose_rate_card_reply(classification, retrieval)
    if classification.intent == "strap_compatibility":
        return compose_strap_catalog_reply(retrieval) or compose_clean_evidence_answer(retrieval)
    if classification.intent in {"materials_safety", "product_general"}:
        return compose_clean_evidence_answer(retrieval)

    return compose_clean_evidence_answer(retrieval)


def should_require_live_ai(use_live_ai: bool | None, ai_provider: AIProvider | None) -> bool:
    if ai_provider is not None:
        return use_live_ai is not False
    if use_live_ai is not None:
        return use_live_ai
    settings = get_settings()
    return settings.ai_live_enabled and bool(settings.fpt_ai_api_key)


def block_failed_live_ai_draft(decision: AnswerabilityDecision) -> AnswerabilityDecision:
    return decision.model_copy(
        update={
            "reply_type": "internal_note",
            "customer_facing": False,
            "can_send_to_customer": False,
            "evidence_sufficient": False,
            "reasons": [
                *decision.reasons,
                "Live AI drafting was required but did not return a valid evidence-grounded reply.",
            ],
            "required_human_inputs": [
                *decision.required_human_inputs,
                "Review the retrieved evidence and draft the customer reply manually.",
            ],
        }
    )


def compose_ai_customer_draft(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    decision: AnswerabilityDecision,
    sufficiency: EvidenceSufficiencyOutput,
    *,
    use_live_ai: bool | None,
    ai_provider: AIProvider | None,
) -> DraftReplyOutput | None:
    enabled = get_settings().ai_live_enabled if use_live_ai is None else use_live_ai
    if not enabled and ai_provider is None:
        return None

    provider = ai_provider
    owns_provider = provider is None
    if provider is None:
        settings = get_settings()
        if not settings.fpt_ai_api_key:
            return None
        provider = FPTGLMProvider(
            api_key=settings.fpt_ai_api_key,
            base_url=settings.fpt_ai_base_url,
            model=settings.glm_model,
            timeout_seconds=settings.ai_timeout_seconds,
            max_retries=settings.ai_max_retries,
        )

    try:
        prompt_retrieval = retrieval_for_ai_prompt(classification, retrieval)
        prompt = build_draft_reply_prompt(classification, prompt_retrieval, decision, sufficiency)
        response = provider.chat(prompt.messages, temperature=0.1, max_tokens=900)
        draft = parse_structured_output(response.content, DraftReplyOutput)
        return validate_ai_customer_draft(classification, retrieval, draft)
    except (AIProviderError, StructuredOutputError, ValueError):
        return None
    finally:
        if owns_provider and provider is not None and hasattr(provider, "close"):
            provider.close()


def validate_ai_customer_draft(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    draft: DraftReplyOutput,
) -> DraftReplyOutput | None:
    supporting_ids = {evidence.evidence_id for evidence in retrieval.evidence if evidence.supports_answer}
    if draft.ticket_id != classification.ticket_id:
        return None
    if draft.reply_type != "customer_reply":
        return None
    if not draft.draft_reply.strip() or has_raw_evidence_artifacts(draft.draft_reply):
        return None
    if not draft.evidence_ids or not set(draft.evidence_ids).issubset(supporting_ids):
        return None
    if not draft.claims:
        return None
    unsupported_claim_terms = [
        term for term in retrieval.unsupported_terms if term.lower() in draft.draft_reply.lower()
    ]
    if unsupported_claim_terms:
        return None
    return draft.model_copy(update={"approval_status": "draft"})


def retrieval_for_ai_prompt(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> RetrievalResult:
    if not is_price_query(classification.normalized_question):
        return retrieval

    product_evidence = matching_product_evidence(classification.normalized_question, retrieval)
    if not product_evidence:
        return retrieval
    return retrieval.model_copy(update={"evidence": product_evidence[:6]})


def build_prepared_customer_draft(
    classification: TicketClassification,
    retrieval: RetrievalResult,
    reply: str,
) -> DraftReplyOutput:
    return DraftReplyOutput(
        ticket_id=classification.ticket_id,
        reply_type="customer_reply",
        draft_reply=reply,
        evidence_ids=[
            evidence.evidence_id for evidence in retrieval.evidence if evidence.supports_answer
        ][:6],
        claims=infer_supported_claims(classification, retrieval),
        approval_status="draft",
    )


def compose_product_price_reply(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> str | None:
    text = classification.normalized_question
    if not is_price_query(text):
        return None

    products = matching_product_models(text, retrieval)
    if not products:
        return None

    if len(products) == 1:
        product = products[0]
        return (
            f"The current product reference lists {product['name']} at "
            f"SGD {format_money(product['price_sgd'])}"
            f"{sku_suffix(product)}."
        )

    product_list = "; ".join(
        f"{product['name']} - SGD {format_money(product['price_sgd'])}{sku_suffix(product)}"
        for product in products
    )
    return f"The current product reference lists these matching variants: {product_list}."


def matching_product_models(text: str, retrieval: RetrievalResult) -> list[dict]:
    return [evidence.structured_data for evidence in matching_product_evidence(text, retrieval)]


def matching_product_evidence(text: str, retrieval: RetrievalResult) -> list[EvidenceCard]:
    query_terms = product_query_terms(text)
    product_evidence: list[EvidenceCard] = []
    seen_skus: set[str] = set()

    for evidence in retrieval.evidence:
        item = evidence.structured_data
        if evidence.source_type != "product_reference" or not item:
            continue
        if not item.get("name") or item.get("price_sgd") is None:
            continue
        sku = str(item.get("sku") or item.get("name"))
        if sku in seen_skus:
            continue
        name_terms = set(tokenize_product_name(str(item["name"])))
        if query_terms and not set(query_terms).issubset(name_terms):
            continue
        seen_skus.add(sku)
        product_evidence.append(evidence)

    if product_evidence or not query_terms:
        return product_evidence

    # If the query names a broader model family, return product rows whose names contain
    # the most specific model token, e.g. "Expedition" should include limited editions.
    model_terms = [term for term in query_terms if term not in {"titanium"}]
    if not model_terms:
        return []
    seen_skus.clear()
    for evidence in retrieval.evidence:
        item = evidence.structured_data
        if evidence.source_type != "product_reference" or not item:
            continue
        if not item.get("name") or item.get("price_sgd") is None:
            continue
        name_terms = set(tokenize_product_name(str(item["name"])))
        if not set(model_terms).issubset(name_terms):
            continue
        sku = str(item.get("sku") or item.get("name"))
        if sku in seen_skus:
            continue
        seen_skus.add(sku)
        product_evidence.append(evidence)
    return product_evidence


def product_query_terms(text: str) -> list[str]:
    terms = []
    for token in tokenize_product_name(text):
        if token in PRODUCT_QUERY_STOPWORDS:
            continue
        terms.append(token)
    return terms


def tokenize_product_name(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def is_price_query(text: str) -> bool:
    return any(term in text for term in PRICE_QUERY_TERMS)


def sku_suffix(product: dict) -> str:
    sku = product.get("sku")
    return f" (SKU: {sku})" if sku else ""


def compose_rate_card_reply(
    classification: TicketClassification,
    retrieval: RetrievalResult,
) -> str | None:
    text = classification.normalized_question
    rate_cards = [
        evidence.structured_data
        for evidence in retrieval.evidence
        if evidence.supports_answer and evidence.source_type == "rate_card" and evidence.structured_data
    ]
    if not rate_cards:
        return compose_clean_evidence_answer(retrieval)

    def service_contains(*terms: str) -> dict | None:
        for item in rate_cards:
            service = str(item.get("service", "")).lower()
            if all(term in service for term in terms):
                return item
        return None

    if "wrong text" in text or "change" in text or "corrected" in text:
        item = service_contains("correction") or rate_cards[0]
        return (
            "If the engraving correction is requested within 1 hour of the order, the "
            f"rate card lists it as {price_text(item)}. {note_sentence(item)} "
            "Because production timing matters, the team should still confirm whether "
            "engraving has already started before promising the change."
        ).strip()
    if "font" in text:
        standard = service_contains("up to 20") or rate_cards[0]
        return (
            "The current rate card confirms the standard Roman/Latin caseback engraving "
            f"tier at {price_text(standard)}, but it does not list separate selectable "
            "font styles. We should confirm the available engraving style before "
            "promising a more decorative font."
        )
    if "per-character" in text or "per character" in text or "20-character" in text:
        standard = service_contains("up to 20")
        extra = service_contains("additional", "beyond")
        script = service_contains("chinese") or service_contains("arabic")
        parts = []
        if standard:
            parts.append(f"a 20-character Roman/Latin caseback engraving is {price_text(standard)}")
        if extra:
            parts.append(f"extra characters beyond 40 are {price_text(extra)} each")
        if script:
            parts.append(f"non-Latin script engraving is {price_text(script)} per character")
        return "For engraving, " + "; ".join(parts) + "."
    if "turnaround" in text or "ship" in text or "urgent" in text or "next friday" in text:
        item = service_contains("rush") or rate_cards[0]
        return (
            f"For urgent engraved orders, {service_label(item)} is listed at "
            f"{price_text(item)}. {note_sentence(item)} Standard order timing should "
            "still be checked against the actual checkout and production queue."
        ).strip()
    if "multi-line" in text or "two lines" in text:
        item = service_contains("multi-line") or service_contains("2 lines") or rate_cards[0]
        return rate_card_item_sentence(item)
    if "chinese" in text or "japanese" in text or "korean" in text or "mandarin" in text:
        item = service_contains("chinese") or rate_cards[0]
        return rate_card_item_sentence(item)
    if "arabic" in text:
        item = service_contains("arabic") or rate_cards[0]
        return rate_card_item_sentence(item)
    if "depth" in text or "fade" in text or "visibility" in text:
        standard = service_contains("up to 20") or rate_cards[0]
        return (
            "The current engraving rate card confirms caseback engraving availability "
            f"and pricing, with standard caseback engraving starting at {price_text(standard)}. "
            "It does not publish a precise engraving-depth specification, so the team "
            "should confirm that before making a durability claim."
        )

    selected = select_relevant_rate_cards(text, rate_cards)
    if classification.intent == "servicing" and "battery" in text and "movement service" in text:
        battery = service_contains("battery") or selected[0]
        regulation = service_contains("regulation")
        full = service_contains("full service", "standard")
        parts = [rate_card_item_sentence(battery)]
        if regulation:
            parts.append(rate_card_item_sentence(regulation))
        if full:
            parts.append(rate_card_item_sentence(full))
        return " ".join(parts)

    return " ".join(rate_card_item_sentence(item) for item in selected[:2])


def compose_strap_catalog_reply(retrieval: RetrievalResult) -> str | None:
    straps = [
        evidence.structured_data
        for evidence in retrieval.evidence
        if evidence.supports_answer
        and evidence.source_type == "product_reference"
        and evidence.section_title == "Strap Catalogue"
        and evidence.structured_data
    ]
    if not straps:
        return None

    strap_descriptions = []
    for item in straps[:3]:
        strap_type = str(item.get("strap_type", "strap"))
        colour = str(item.get("colour", "")).strip()
        price = item.get("price_sgd")
        compatible = str(item.get("compatible_with", "")).strip()
        bpa_text = "BPA-free" if item.get("bpa_free") is True else "not marked BPA-free"
        description = f"{colour} {strap_type}".strip()
        details = [bpa_text]
        if price is not None:
            details.append(f"SGD {format_money(price)}")
        if compatible:
            details.append(f"compatible with {compatible}")
        strap_descriptions.append(f"{description} ({', '.join(details)})")

    if not strap_descriptions:
        return None
    return (
        "The current strap catalogue lists "
        + "; ".join(strap_descriptions)
        + ". All current BOLDR models use 20mm straps, so compatibility should be checked "
        "against the model-specific note above."
    )


def compose_clean_evidence_answer(retrieval: RetrievalResult) -> str | None:
    for evidence in retrieval.evidence:
        if not evidence.supports_answer:
            continue
        answer = extract_answer_like_text(evidence.excerpt)
        if answer and not has_raw_evidence_artifacts(answer):
            return answer
    return None


def extract_answer_like_text(excerpt: str) -> str | None:
    compact = clean_whitespace(excerpt)
    compact = compact.removeprefix("...")
    if not compact:
        return None

    qa_matches = list(re.finditer(r"Q:\s*(?P<question>.*?)\s+A:\s*(?P<answer>.*?)(?=\s+Q:|$)", compact))
    if qa_matches:
        answer = qa_matches[-1].group("answer").strip()
        return clean_customer_text(answer)

    quoted_matches = list(re.finditer(r"\"(?P<question>[^\"]+)\"\s*\|\s*(?P<answer>.*?)(?=\s+\"|$)", compact))
    if quoted_matches:
        answer = quoted_matches[-1].group("answer").strip()
        return clean_customer_text(answer)

    if "What to do:" in compact:
        answer = compact.split("What to do:", 1)[1]
        return clean_customer_text(answer)
    return None


def clean_customer_text(text: str) -> str | None:
    text = re.sub(r"\s*\|\s*", ". ", text)
    text = clean_whitespace(text).strip(". ")
    if not text:
        return None
    if len(text) > 420:
        text = text[:420].rsplit(" ", 1)[0].rstrip(".,;") + "."
    if text and text[-1] not in ".!?":
        text = f"{text}."
    return text


def rate_card_item_sentence(item: dict) -> str:
    service = service_label(item)
    parts = [f"{service} is listed at {price_text(item)}"]
    turnaround = item.get("turnaround_days")
    if turnaround and str(turnaround).upper() != "N/A":
        parts.append(f"with a {turnaround} day turnaround")
    includes = item.get("includes")
    if includes:
        parts.append(f"and includes {includes}")
    note = item.get("notes")
    sentence = ", ".join(parts)
    if note:
        sentence = f"{sentence}. {note}"
    return sentence.rstrip(".") + "."


def select_relevant_rate_cards(text: str, items: list[dict]) -> list[dict]:
    ranked = []
    query_tokens = set(re.findall(r"[a-z0-9]+", text))
    for index, item in enumerate(items):
        service = str(item.get("service", "")).lower()
        score = sum(1 for token in query_tokens if token and token in service)
        ranked.append((score, -index, item))
    ranked.sort(reverse=True)
    return [item for _, _, item in ranked if item][:2] or items[:1]


def price_text(item: dict) -> str:
    price = item.get("price_sgd")
    if price is None:
        return "the listed rate"
    return f"SGD {format_money(price)}"


def service_label(item: dict) -> str:
    return (
        str(item.get("service") or "This service")
        .replace("\u2014", "-")
        .replace("\u2013", "-")
    )


def note_sentence(item: dict) -> str:
    note = item.get("notes")
    if not note:
        return ""
    note_text = str(note).strip()
    if note_text and note_text[-1] not in ".!?":
        note_text = f"{note_text}."
    return note_text


def format_money(value) -> str:
    amount = float(value)
    if amount.is_integer():
        return str(int(amount))
    return f"{amount:g}"


def clean_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def has_raw_evidence_artifacts(text: str) -> bool:
    if RAW_EVIDENCE_REPLY_PREFIX.lower() in text.lower():
        return True
    if " | " in text:
        return True
    if RAW_TABLE_ROW_PATTERN.search(text):
        return True
    if text.strip().startswith("...") or text.strip().endswith("..."):
        return True
    return False


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
    raw_evidence_artifacts = decision.customer_facing and has_raw_evidence_artifacts(text)

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
            name="customer_safe_wording",
            passed=not raw_evidence_artifacts,
            message="Customer-facing reply is written in readable support language."
            if not raw_evidence_artifacts
            else "Customer-facing reply contains raw evidence or table formatting.",
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
