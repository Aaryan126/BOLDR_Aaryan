from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.classification import TicketClassification
from app.models.dataset import TicketRecord
from app.models.insights import (
    MarketingBrief,
    MarketingBriefRequest,
    MarketingOpportunity,
    ThemeEvidence,
    ThemeRadarItem,
    ThemeRadarMeta,
)
from app.services.classifications import list_ticket_classifications
from app.services.datasets import get_dataset_snapshot
from app.services.workflow import list_knowledge_gaps

EXPECTED_THEMES = [
    "Materials and Safety",
    "Engraving and Personalisation",
    "Strap Compatibility",
    "Watch Servicing and Aftercare",
    "Orders, Shipping, and Returns",
    "Active and Outdoor Use",
    "Sustainability and Ethics",
    "Collector and Technical Specs",
    "Corporate and Gifting",
]

PRODUCT_PAGE_GAP_THEMES = {
    "Materials and Safety",
    "Strap Compatibility",
    "Active and Outdoor Use",
    "Sustainability and Ethics",
    "Collector and Technical Specs",
}

THEME_MARKETING_ACTIONS = {
    "Materials and Safety": (
        "Add plain-language safety badges and comparison tables for BPA-free straps, "
        "titanium grades, hypoallergenic caveats, and child-safe recommendations."
    ),
    "Engraving and Personalisation": (
        "Build seasonal gifting campaigns around engraving depth, scripts, turnaround, "
        "and caseback personalisation."
    ),
    "Strap Compatibility": (
        "Create a strap finder that combines lug width, quick-release, skin sensitivity, "
        "water use, and colour availability."
    ),
    "Watch Servicing and Aftercare": (
        "Turn servicing questions into an aftercare hub with price, turnaround, warranty, "
        "and international service expectations."
    ),
    "Orders, Shipping, and Returns": (
        "Improve transactional messaging at checkout and post-purchase for customs, "
        "delivery changes, returns, cancellations, and refund status."
    ),
    "Active and Outdoor Use": (
        "Develop adventure lifestyle content that states water, trail, climbing, altitude, "
        "and shock-use boundaries without overclaiming."
    ),
    "Sustainability and Ethics": (
        "Create a sustainability roadmap page covering vegan straps, packaging, recycling, "
        "and carbon-neutral shipping decisions."
    ),
    "Collector and Technical Specs": (
        "Publish collector-oriented spec cards for titanium grade, movements, limited "
        "editions, warranty, collaborations, and resale questions."
    ),
    "Corporate and Gifting": (
        "Package gift wrap, bulk order routing, and personalisation choices into a gifting "
        "landing page for seasonal and corporate buyers."
    ),
}

THEME_CAMPAIGN_ANGLES = {
    "Materials and Safety": "BPA-free and skin-safe strap confidence.",
    "Engraving and Personalisation": "Personalised BOLDR gifts for birthdays, anniversaries, and Father Day.",
    "Strap Compatibility": "Find the right strap for the way you wear your watch.",
    "Watch Servicing and Aftercare": "Keep your BOLDR field-ready for years.",
    "Orders, Shipping, and Returns": "Clear delivery, return, and order-change expectations.",
    "Active and Outdoor Use": "Adventure-tested guidance for swimmers, runners, climbers, and trekkers.",
    "Sustainability and Ethics": "Responsible materials, packaging, and strap lifecycle decisions.",
    "Collector and Technical Specs": "Micro-brand specs and limited-edition craftsmanship.",
    "Corporate and Gifting": "BOLDR personalisation for gifts and teams.",
}


@dataclass(frozen=True)
class TicketThemeAssignment:
    theme_name: str
    ticket: TicketRecord
    classification: TicketClassification


def get_theme_radar() -> tuple[list[ThemeRadarItem], ThemeRadarMeta]:
    assignments = _build_theme_assignments()
    grouped: dict[str, list[TicketThemeAssignment]] = defaultdict(list)
    for assignment in assignments:
        grouped[assignment.theme_name].append(assignment)

    gaps_by_ticket = {
        ticket_id: gap
        for gap in list_knowledge_gaps()
        for ticket_id in gap.source_ticket_ids
    }
    midpoint = _date_midpoint([assignment.ticket for assignment in assignments])

    items = [
        _build_theme_item(theme_name, grouped[theme_name], gaps_by_ticket, midpoint)
        for theme_name in EXPECTED_THEMES
        if grouped.get(theme_name)
    ]
    items.sort(key=lambda item: (-item.frequency, item.theme_name))
    meta = ThemeRadarMeta(
        total_ticket_count=len(get_dataset_snapshot().tickets),
        clustered_ticket_count=sum(item.frequency for item in items),
        theme_count=len(items),
        generated_at=_now_iso(),
    )
    return items, meta


def generate_marketing_brief(
    request: MarketingBriefRequest | None = None,
) -> MarketingBrief:
    request = request or MarketingBriefRequest()
    radar, meta = get_theme_radar()
    period_label = request.period_label or _default_period_label()
    opportunities = [_build_opportunity(theme) for theme in radar[:6]]
    markdown = _build_markdown(period_label, radar, opportunities, meta)
    return MarketingBrief(
        brief_id=f"brief-{period_label.lower().replace(' ', '-').replace('/', '-')}",
        period_label=period_label,
        generated_at=meta.generated_at,
        source_ticket_count=meta.total_ticket_count,
        theme_count=meta.theme_count,
        markdown=markdown,
        opportunities=opportunities,
    )


def _build_theme_assignments() -> list[TicketThemeAssignment]:
    tickets_by_id = {ticket.ticket_id: ticket for ticket in get_dataset_snapshot().tickets}
    assignments: list[TicketThemeAssignment] = []
    for classification in list_ticket_classifications():
        ticket = tickets_by_id[classification.ticket_id]
        assignments.append(
            TicketThemeAssignment(
                theme_name=_assign_theme(classification),
                ticket=ticket,
                classification=classification,
            )
        )
    return assignments


def _assign_theme(classification: TicketClassification) -> str:
    text = f"{classification.normalized_question} {classification.intent}".lower()
    qtype = classification.csv_question_type
    tags = set(classification.operational_tags)

    if "corporate_or_bulk" in tags or any(term in text for term in ["wholesale", "bulk order"]):
        return "Corporate and Gifting"
    if any(term in text for term in ["gift wrap", "gift wrapping", "gifting"]) and qtype != "engraving":
        return "Corporate and Gifting"
    if "sustainability_signal" in tags or any(
        term in text
        for term in [
            "carbon",
            "recycling",
            "vegan",
            "sustainability",
            "animal products",
            "offset",
            "dispose responsibly",
        ]
    ):
        return "Sustainability and Ethics"
    if any(
        term in text
        for term in [
            "trail running",
            "rock climbing",
            "extreme sports",
            "high-altitude",
            "5,000m",
            "swimming",
            "water resistance and materials",
        ]
    ):
        return "Active and Outdoor Use"
    if qtype == "engraving" or any(term in text for term in ["engraving", "engrave"]):
        return "Engraving and Personalisation"
    if qtype == "strap_compatibility":
        return "Strap Compatibility"
    if qtype == "servicing":
        return "Watch Servicing and Aftercare"
    if qtype == "order_status" or any(
        term in text
        for term in [
            "order",
            "shipping",
            "delivery",
            "refund",
            "return policy",
            "customs",
            "cancel",
            "tracking",
            "discount code",
        ]
    ):
        return "Orders, Shipping, and Returns"
    if qtype == "materials_safety" or "safety_question" in tags:
        return "Materials and Safety"
    if "collector_or_specs" in tags or qtype in {"product_general", "knowledge_gap"}:
        return "Collector and Technical Specs"
    return "Collector and Technical Specs"


def _build_theme_item(
    theme_name: str,
    assignments: list[TicketThemeAssignment],
    gaps_by_ticket: dict[str, object],
    midpoint: datetime,
) -> ThemeRadarItem:
    answerability_counts = Counter(
        assignment.classification.answerability for assignment in assignments
    )
    persona_counts = Counter(assignment.classification.persona for assignment in assignments)
    gap_count = sum(1 for assignment in assignments if assignment.ticket.ticket_id in gaps_by_ticket)
    recent_count = sum(
        1 for assignment in assignments if _parse_ticket_date(assignment.ticket) >= midpoint
    )
    older_count = len(assignments) - recent_count
    product_page_gap = (
        theme_name in PRODUCT_PAGE_GAP_THEMES
        or gap_count > 0
        or any(assignment.classification.answerability == "answerable" for assignment in assignments)
        and theme_name
        in {
            "Materials and Safety",
            "Strap Compatibility",
            "Watch Servicing and Aftercare",
            "Collector and Technical Specs",
        }
    )
    marketing_signal = theme_name in {
        "Active and Outdoor Use",
        "Sustainability and Ethics",
        "Engraving and Personalisation",
        "Corporate and Gifting",
        "Collector and Technical Specs",
    } or any(
        persona in persona_counts
        for persona in ["Sustainability Advocate", "Gifter", "Active / Outdoor Buyer"]
    )

    return ThemeRadarItem(
        theme_name=theme_name,
        frequency=len(assignments),
        trend_direction=_trend_direction(recent_count, older_count),
        representative_ticket_ids=[assignment.ticket.ticket_id for assignment in assignments[:5]],
        common_customer_wording=[
            _customer_wording(assignment.classification) for assignment in assignments[:4]
        ],
        answerability_breakdown=dict(answerability_counts),
        persona_breakdown=dict(persona_counts),
        recommended_kb_action=_kb_action(theme_name, gap_count, product_page_gap),
        recommended_marketing_action=THEME_MARKETING_ACTIONS[theme_name],
        product_page_gap=product_page_gap,
        marketing_signal=marketing_signal,
        gap_count=gap_count,
        evidence=[
            ThemeEvidence(
                ticket_id=assignment.ticket.ticket_id,
                subject=assignment.ticket.subject,
                persona=assignment.classification.persona,
                answerability=assignment.classification.answerability,
                customer_wording=_customer_wording(assignment.classification),
            )
            for assignment in assignments[:3]
        ],
    )


def _build_opportunity(theme: ThemeRadarItem) -> MarketingOpportunity:
    top_personas = [
        persona
        for persona, _count in sorted(
            theme.persona_breakdown.items(), key=lambda item: (-item[1], item[0])
        )[:3]
    ]
    if theme.gap_count:
        insight = (
            f"{theme.gap_count} ticket(s) in this theme are not safely answerable from "
            "the current local knowledge base."
        )
    elif theme.product_page_gap:
        insight = (
            "Customers are asking answerable questions that should be easier to self-serve "
            "from product pages or FAQ content."
        )
    else:
        insight = "The theme is covered, but repeated enquiries show a useful merchandising angle."

    return MarketingOpportunity(
        theme_name=theme.theme_name,
        persona_focus=top_personas,
        insight=insight,
        recommended_action=theme.recommended_marketing_action,
        campaign_angle=THEME_CAMPAIGN_ANGLES[theme.theme_name],
        evidence_ticket_ids=theme.representative_ticket_ids[:3],
        product_page_update_needed=theme.product_page_gap,
    )


def _build_markdown(
    period_label: str,
    radar: list[ThemeRadarItem],
    opportunities: list[MarketingOpportunity],
    meta: ThemeRadarMeta,
) -> str:
    product_page_themes = [theme for theme in radar if theme.product_page_gap]
    gap_themes = [theme for theme in radar if theme.gap_count]
    rising_themes = [theme for theme in radar if theme.trend_direction == "rising"]

    lines = [
        f"# Monthly Marketing Intelligence Brief - {period_label}",
        "",
        "## Executive Summary",
        (
            f"The system clustered {meta.clustered_ticket_count} of {meta.total_ticket_count} "
            f"local tickets into {meta.theme_count} buyer themes using the five required personas. "
            "The strongest opportunities are product-page clarity, FAQ expansion, and persona-led campaigns."
        ),
        "",
        "## What Customers Are Asking That Product Pages Should Answer Better",
    ]
    for theme in product_page_themes[:5]:
        lines.extend(
            [
                f"- **{theme.theme_name}** ({theme.frequency} tickets): "
                f"{theme.recommended_kb_action} Evidence: {', '.join(theme.representative_ticket_ids[:3])}.",
            ]
        )

    lines.extend(["", "## Unanswerable Or Decision-Required Themes"])
    if gap_themes:
        for theme in gap_themes:
            lines.append(
                f"- **{theme.theme_name}** has {theme.gap_count} unresolved gap ticket(s). "
                f"Resolve owner decisions before publishing claims. Evidence: {', '.join(theme.representative_ticket_ids[:3])}."
            )
    else:
        lines.append("- No unresolved knowledge-gap themes are currently present.")

    lines.extend(["", "## Persona-Led Campaign Angles"])
    for opportunity in opportunities:
        personas = ", ".join(opportunity.persona_focus)
        lines.append(
            f"- **{opportunity.theme_name}** for {personas}: {opportunity.campaign_angle} "
            f"Action: {opportunity.recommended_action}"
        )

    lines.extend(["", "## Rising Signals"])
    if rising_themes:
        for theme in rising_themes[:4]:
            lines.append(
                f"- **{theme.theme_name}** is rising with {theme.frequency} ticket(s); "
                f"watch {', '.join(theme.representative_ticket_ids[:3])}."
            )
    else:
        lines.append("- No theme is clearly rising in this sample; use frequency and gaps for prioritisation.")

    lines.extend(["", "## Export Notes", "- JSON output includes theme counts, personas, evidence ticket IDs, and recommended actions."])
    return "\n".join(lines)


def _kb_action(theme_name: str, gap_count: int, product_page_gap: bool) -> str:
    if gap_count:
        return (
            f"Resolve {gap_count} knowledge gap ticket(s), then add a reviewed FAQ entry "
            f"and product-page callout for {theme_name.lower()}."
        )
    if product_page_gap:
        return (
            f"Promote existing answerable content for {theme_name.lower()} into product pages, "
            "FAQ cross-links, and CS macros."
        )
    return "Keep current KB coverage and monitor whether the theme repeats next month."


def _trend_direction(recent_count: int, older_count: int) -> str:
    if recent_count > older_count:
        return "rising"
    if recent_count < older_count:
        return "falling"
    return "stable"


def _customer_wording(classification: TicketClassification) -> str:
    lines = [line.strip() for line in classification.question_text.splitlines() if line.strip()]
    return lines[0] if lines else classification.intent


def _date_midpoint(tickets: list[TicketRecord]) -> datetime:
    dates = sorted(_parse_ticket_date(ticket) for ticket in tickets)
    return dates[len(dates) // 2]


def _parse_ticket_date(ticket: TicketRecord) -> datetime:
    return datetime.strptime(ticket.date_received, "%Y-%m-%d %H:%M").replace(tzinfo=UTC)


def _default_period_label() -> str:
    dates = sorted(_parse_ticket_date(ticket) for ticket in get_dataset_snapshot().tickets)
    first = dates[0].strftime("%b %Y")
    last = dates[-1].strftime("%b %Y")
    return first if first == last else f"{first} - {last}"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
