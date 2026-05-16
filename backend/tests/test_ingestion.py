from pathlib import Path

from app.ingest.loaders import (
    DATA_ROOT,
    dataset_samples,
    load_dataset,
    load_engraving_rate_card,
    load_servicing_rate_card,
    load_tickets,
    write_snapshot,
)


def test_loads_all_ticket_rows_and_labels() -> None:
    tickets = load_tickets(DATA_ROOT / "01_customer_tickets.csv")

    assert len(tickets) == 70
    assert tickets[0].ticket_id == "TKT-1046"
    assert tickets[0].answered_by_kb is False
    assert tickets[0].requires_escalation is True
    assert {ticket.question_type for ticket in tickets} == {
        "engraving",
        "knowledge_gap",
        "materials_safety",
        "order_status",
        "product_general",
        "servicing",
        "strap_compatibility",
    }


def test_loads_rate_cards_with_authoritative_priority() -> None:
    engraving = load_engraving_rate_card(DATA_ROOT / "03a_rate_card_engraving.csv")
    servicing = load_servicing_rate_card(DATA_ROOT / "03b_rate_card_servicing.csv")

    assert len(engraving) == 10
    assert len(servicing) == 10
    assert all(item.source_priority == 1 for item in [*engraving, *servicing])
    assert engraving[0].service == "Caseback engraving - up to 20 characters"
    assert engraving[0].price_sgd == 25
    assert servicing[0].service == "Battery Replacement"
    assert servicing[0].turnaround_days == "3-5"


def test_load_dataset_builds_expected_diagnostics() -> None:
    snapshot = load_dataset()
    diagnostics = snapshot.diagnostics

    assert diagnostics.expected_brief_file_count == 11
    assert diagnostics.actual_source_file_count == 6
    assert diagnostics.warning is not None
    assert "11 files" in diagnostics.warning
    assert diagnostics.ticket_count == 70
    assert diagnostics.answered_by_kb_counts == {"no": 20, "yes": 50}
    assert diagnostics.requires_escalation_counts == {"yes": 26, "no": 44}
    assert diagnostics.engraving_rate_card_count == 10
    assert diagnostics.servicing_rate_card_count == 10
    assert diagnostics.faq_entry_count == 32
    assert diagnostics.product_model_count == 3
    assert diagnostics.strap_item_count == 11
    assert diagnostics.document_section_count >= 15
    assert diagnostics.document_chunk_count >= diagnostics.document_section_count


def test_dataset_samples_cover_every_source_family() -> None:
    snapshot = load_dataset()
    samples = dataset_samples(snapshot)

    assert samples.ticket is not None
    assert samples.engraving_rate_card_item is not None
    assert samples.servicing_rate_card_item is not None
    assert "Materials & Safety" in samples.faq_sections
    assert "1. Overview" in samples.sop_sections
    assert "Current Models" in samples.product_reference_sections
    assert [model.name for model in samples.product_models] == [
        "Expedition Titanium",
        "Journey Titanium",
        "Expedition Titanium - Ember Limited Edition",
    ]
    assert samples.strap_items[0].sku == "STR-FKM-20-BLK"


def test_write_snapshot_creates_generated_json(tmp_path: Path) -> None:
    snapshot = load_dataset()
    output = write_snapshot(snapshot, tmp_path / "dataset_snapshot.json")

    assert output.exists()
    assert "TKT-1046" in output.read_text(encoding="utf-8")
