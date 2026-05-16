from typing import Literal

from pydantic import BaseModel, Field


SourceType = Literal["tickets", "rate_card", "faq", "sop", "product_reference"]


class SourceFile(BaseModel):
    file_name: str
    relative_path: str
    source_type: SourceType
    source_priority: int
    role: str
    exists: bool
    size_bytes: int | None = None


class TicketRecord(BaseModel):
    ticket_id: str
    date_received: str
    customer_name: str
    customer_email: str
    order_id: str | None
    channel: str
    question_type: str
    subject: str
    message_body: str
    status: str
    answered_by_kb: bool
    requires_escalation: bool
    buyer_persona: str
    agent_notes: str | None = None


class RateCardItem(BaseModel):
    category: Literal["engraving", "servicing"]
    source_file: str
    source_priority: int
    service: str
    price_sgd: float | None = None
    turnaround_days: str | None = None
    includes: str | None = None
    notes: str | None = None


class DocumentSection(BaseModel):
    source_file: str
    source_type: SourceType
    source_priority: int
    title: str
    text: str
    order: int


class DocumentChunk(BaseModel):
    chunk_id: str
    source_file: str
    source_type: SourceType
    source_priority: int
    section_title: str
    chunk_index: int
    text: str


class ProductModel(BaseModel):
    name: str
    sku: str | None = None
    price_sgd: float | None = None
    attributes: dict[str, str] = Field(default_factory=dict)


class StrapItem(BaseModel):
    sku: str
    strap_type: str
    colour: str
    bpa_free: bool
    price_sgd: float | None = None
    compatible_with: str


class DatasetDiagnostics(BaseModel):
    expected_brief_file_count: int
    actual_source_file_count: int
    warning: str | None
    missing_files: list[str]
    ticket_count: int
    answered_by_kb_counts: dict[str, int]
    requires_escalation_counts: dict[str, int]
    question_type_counts: dict[str, int]
    buyer_persona_counts: dict[str, int]
    channel_counts: dict[str, int]
    status_counts: dict[str, int]
    engraving_rate_card_count: int
    servicing_rate_card_count: int
    document_section_count: int
    document_chunk_count: int
    faq_entry_count: int
    product_model_count: int
    strap_item_count: int
    source_priorities: dict[str, int]


class DatasetSnapshot(BaseModel):
    sources: list[SourceFile]
    tickets: list[TicketRecord]
    rate_card_items: list[RateCardItem]
    document_sections: list[DocumentSection]
    document_chunks: list[DocumentChunk]
    product_models: list[ProductModel]
    strap_items: list[StrapItem]
    diagnostics: DatasetDiagnostics


class DatasetSamples(BaseModel):
    ticket: TicketRecord | None
    engraving_rate_card_item: RateCardItem | None
    servicing_rate_card_item: RateCardItem | None
    faq_sections: list[str]
    sop_sections: list[str]
    product_reference_sections: list[str]
    product_models: list[ProductModel]
    strap_items: list[StrapItem]
