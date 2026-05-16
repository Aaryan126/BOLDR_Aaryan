from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime

from app.models.external import (
    BenchmarkExternalSourceSummary,
    ExternalBenchmark,
    ExternalMention,
    ExternalSource,
)
from app.services.insights import get_theme_radar

CAPTURED_AT = "2026-05-16T00:00:00Z"

EXTERNAL_SOURCES = [
    ExternalSource(
        source_id="source-reddit-watches",
        name="Reddit r/Watches",
        source_type="reddit",
        url="https://www.reddit.com/r/Watches/",
        rationale="Broad watch-buyer and enthusiast discussion with fast-moving concerns, recommendations, and objections.",
        buyer_signals=["mainstream buyer concerns", "strap safety", "product recommendations"],
        limitations="Curated sample only; not a live Reddit API pull.",
    ),
    ExternalSource(
        source_id="source-watchuseek",
        name="WatchUSeek forums",
        source_type="watch_forum",
        url="https://www.watchuseek.com/",
        rationale="Long-form technical discussion from watch enthusiasts, collectors, and material-sensitive buyers.",
        buyer_signals=["materials safety", "nickel allergy", "microbrand confidence", "technical specs"],
        limitations="Curated public-thread sample; forum volume is not normalized by traffic.",
    ),
    ExternalSource(
        source_id="source-monochrome",
        name="Monochrome Watches",
        source_type="industry_article",
        url="https://monochrome-watches.com/",
        rationale="Editorial watch-industry source for sustainability, vegan straps, and material trends.",
        buyer_signals=["sustainability trend", "vegan materials", "brand positioning"],
        limitations="Editorial article sample, not customer-review volume.",
    ),
    ExternalSource(
        source_id="source-watchcrunch",
        name="WatchCrunch",
        source_type="review_platform",
        url="https://www.watchcrunch.com/",
        rationale="Modern enthusiast review/community platform useful for microbrand perception and product comparison signals.",
        buyer_signals=["review sentiment", "collector confidence", "ownership experience"],
        limitations="Curated source category in this version; connector is planned later.",
    ),
    ExternalSource(
        source_id="source-reviewwristwatches",
        name="Review Wrist Watches",
        source_type="competitor_review",
        url="https://reviewwristwatches.com/boldr-review-a-surprising-product-from-a-micro-brand/",
        rationale="Independent review coverage for BOLDR and comparable microbrand positioning.",
        buyer_signals=["microbrand quality", "value perception", "field-watch comparison"],
        limitations="Single-review source; should be broadened before production decisions.",
    ),
]

EXTERNAL_MENTIONS = [
    ExternalMention(
        mention_id="mention-watchuseek-nickel-allergy",
        source_id="source-watchuseek",
        theme_key="materials_safety",
        source_url="https://www.watchuseek.com/threads/nickel-allergy-question.5330026/",
        source_title="Nickel allergy question",
        sentiment="concerned",
        mention_count=18,
        representative_claims=[
            "Nickel allergy buyers often compare steel, coated steel, and titanium options.",
            "Titanium is repeatedly discussed as a safer material choice for sensitive skin.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-watchuseek-steel-nickel",
        source_id="source-watchuseek",
        theme_key="materials_safety",
        source_url="https://www.watchuseek.com/threads/do-stainless-steel-watches-contain-nickel.991756/",
        source_title="Do stainless steel watches contain nickel?",
        sentiment="mixed",
        mention_count=11,
        representative_claims=[
            "Buyers ask for concrete nickel and hypoallergenic guidance, not generic metal claims.",
            "Material reassurance is strongest when brands name the case and strap materials clearly.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-reddit-fkm-hazard",
        source_id="source-reddit-watches",
        theme_key="strap_outdoor_safety",
        source_url="https://www.reddit.com/r/Watches/comments/1mk1128/all_watches_are_fkm_rubber_straps_hazardous/",
        source_title="FKM rubber strap safety discussion",
        sentiment="concerned",
        mention_count=15,
        representative_claims=[
            "FKM and rubber strap discussions increasingly include health and chemical-safety questions.",
            "Buyers compare FKM, silicone, polyurethane, NATO, and natural-rubber alternatives.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-reddit-pfas-free-strap",
        source_id="source-reddit-watches",
        theme_key="strap_outdoor_safety",
        source_url="https://www.reddit.com/r/Watches/comments/1k2z2cu",
        source_title="PFAS-free bracelet/strap recommendation",
        sentiment="opportunity",
        mention_count=9,
        representative_claims=[
            "PFAS-free and material-transparent strap positioning can differentiate brands.",
            "Outdoor and daily-wear buyers want practical strap options, not only technical specs.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-monochrome-vegan-straps",
        source_id="source-monochrome",
        theme_key="sustainability",
        source_url="https://monochrome-watches.com/editorial-vegan-straps-eco-friendly-recycled-materials-in-watchmaking/",
        source_title="Vegan straps and eco-friendly recycled materials in watchmaking",
        sentiment="opportunity",
        mention_count=12,
        representative_claims=[
            "Vegan straps and recycled materials are visible watch-industry positioning themes.",
            "Sustainability claims need concrete materials, packaging, and lifecycle details.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-reddit-microbrand-signal",
        source_id="source-reddit-watches",
        theme_key="collector_confidence",
        source_url="https://www.reddit.com/r/MicrobrandWatches/",
        source_title="Microbrand watch community",
        sentiment="mixed",
        mention_count=14,
        representative_claims=[
            "Microbrand buyers look for movement, case material, warranty, and brand credibility signals.",
            "Collector confidence is tied to transparent specs and owner experience.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-reviewwristwatches-boldr",
        source_id="source-reviewwristwatches",
        theme_key="collector_confidence",
        source_url="https://reviewwristwatches.com/boldr-review-a-surprising-product-from-a-micro-brand/",
        source_title="BOLDR microbrand review",
        sentiment="positive",
        mention_count=6,
        representative_claims=[
            "Independent reviews can support microbrand credibility and value framing.",
            "Review-led traffic should be connected to product-page proof points.",
        ],
        captured_at=CAPTURED_AT,
    ),
    ExternalMention(
        mention_id="mention-watchcrunch-gifting",
        source_id="source-watchcrunch",
        theme_key="gifting_personalisation",
        source_url="https://www.watchcrunch.com/",
        source_title="Watch enthusiast reviews and posts",
        sentiment="opportunity",
        mention_count=7,
        representative_claims=[
            "Personalisation, giftability, and ownership stories matter in community reviews.",
            "Gift buyers need clearer purchase confidence than collectors do.",
        ],
        captured_at=CAPTURED_AT,
    ),
]

BENCHMARK_THEMES = {
    "materials_safety": {
        "theme": "Titanium, nickel allergy, and hypoallergenic safety",
        "internal_theme_names": ["Materials and Safety", "Collector and Technical Specs"],
        "classification": "market_wide_concern_with_boldr_gap",
        "recommended_action": (
            "Add a product-page materials table covering titanium grade, nickel/allergy caveats, "
            "BPA-free straps, hypoallergenic positioning, and child-safe strap recommendations."
        ),
        "confidence": 0.82,
    },
    "strap_outdoor_safety": {
        "theme": "FKM/rubber straps, BPA safety, and outdoor use",
        "internal_theme_names": ["Strap Compatibility", "Active and Outdoor Use", "Materials and Safety"],
        "classification": "market_wide_signal",
        "recommended_action": (
            "Build a strap finder that makes FKM, nylon NATO, leather, water use, skin sensitivity, "
            "and BPA-free positioning easy to compare."
        ),
        "confidence": 0.78,
    },
    "sustainability": {
        "theme": "Sustainability, vegan straps, recycling, packaging, and carbon-neutral shipping",
        "internal_theme_names": ["Sustainability and Ethics"],
        "classification": "market_wide_concern_with_boldr_gap",
        "recommended_action": (
            "Publish a sustainability roadmap with vegan strap stance, strap recycling decision, "
            "packaging details, and carbon-neutral shipping status."
        ),
        "confidence": 0.86,
    },
    "collector_confidence": {
        "theme": "Microbrand quality, resale value, and collector confidence",
        "internal_theme_names": ["Collector and Technical Specs"],
        "classification": "covered_but_under_merchandised",
        "recommended_action": (
            "Create collector spec cards with movement, titanium grade, warranty, limited-edition, "
            "serviceability, and independent-review proof points."
        ),
        "confidence": 0.72,
    },
    "gifting_personalisation": {
        "theme": "Gifting, engraving, personalisation, and corporate orders",
        "internal_theme_names": ["Engraving and Personalisation", "Corporate and Gifting"],
        "classification": "covered_but_under_merchandised",
        "recommended_action": (
            "Create seasonal gifting pages that combine engraving options, gift wrap, turnaround, "
            "script limits, and corporate order routing."
        ),
        "confidence": 0.68,
    },
}


def list_external_sources() -> list[ExternalSource]:
    return EXTERNAL_SOURCES


def list_external_mentions() -> list[ExternalMention]:
    return EXTERNAL_MENTIONS


def generate_external_benchmarks() -> list[ExternalBenchmark]:
    radar, _meta = get_theme_radar()
    theme_lookup = {theme.theme_name: theme for theme in radar}
    source_lookup = {source.source_id: source for source in EXTERNAL_SOURCES}
    benchmarks: list[ExternalBenchmark] = []

    for theme_key, config in BENCHMARK_THEMES.items():
        internal_theme_names = config["internal_theme_names"]
        internal_themes = [theme_lookup[name] for name in internal_theme_names if name in theme_lookup]
        mention_rows = [mention for mention in EXTERNAL_MENTIONS if mention.theme_key == theme_key]
        source_summaries = [
            BenchmarkExternalSourceSummary(
                source_id=mention.source_id,
                name=source_lookup[mention.source_id].name,
                source_type=source_lookup[mention.source_id].source_type,
                source_url=mention.source_url,
                mention_count=mention.mention_count,
                sentiment=mention.sentiment,
                representative_claims=mention.representative_claims,
            )
            for mention in mention_rows
        ]

        persona_counts: Counter[str] = Counter()
        ticket_ids: list[str] = []
        for internal_theme in internal_themes:
            persona_counts.update(internal_theme.persona_breakdown)
            ticket_ids.extend(internal_theme.representative_ticket_ids)

        benchmarks.append(
            ExternalBenchmark(
                theme_key=theme_key,
                theme=config["theme"],
                internal_ticket_count=sum(theme.frequency for theme in internal_themes),
                internal_ticket_ids=_unique(ticket_ids),
                internal_personas=[
                    persona
                    for persona, _count in sorted(
                        persona_counts.items(), key=lambda item: (-item[1], item[0])
                    )
                ],
                external_sources=source_summaries,
                external_mention_count=sum(mention.mention_count for mention in mention_rows),
                external_sentiment=_dominant_sentiment(mention_rows),
                classification=config["classification"],
                recommended_action=config["recommended_action"],
                confidence=config["confidence"],
                source_urls=[mention.source_url for mention in mention_rows],
                source_limitations=_unique(
                    source_lookup[mention.source_id].limitations for mention in mention_rows
                ),
            )
        )
    return benchmarks


def _dominant_sentiment(mentions: list[ExternalMention]) -> str:
    if not mentions:
        return "mixed"
    counts: Counter[str] = Counter()
    for mention in mentions:
        counts[mention.sentiment] += mention.mention_count
    return counts.most_common(1)[0][0]


def _unique(values) -> list:
    seen = set()
    output = []
    for value in values:
        if value not in seen:
            seen.add(value)
            output.append(value)
    return output


def current_timestamp() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
