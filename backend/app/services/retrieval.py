from functools import lru_cache

from app.intelligence.retrieval import EvidenceRetriever
from app.models.retrieval import RetrievalEvaluation, RetrievalResult
from app.services.classifications import (
    get_ticket_classification,
    get_ticket_classifications,
)
from app.services.datasets import get_dataset_snapshot


@lru_cache
def get_evidence_retriever() -> EvidenceRetriever:
    return EvidenceRetriever(get_dataset_snapshot())


def search_knowledge(query: str, limit: int = 8) -> RetrievalResult:
    return get_evidence_retriever().search(query=query, limit=limit)


def search_ticket_evidence(ticket_id: str) -> RetrievalResult | None:
    classification = get_ticket_classification(ticket_id)
    if classification is None:
        return None
    return get_evidence_retriever().search_ticket(classification)


@lru_cache
def get_retrieval_evaluation() -> RetrievalEvaluation:
    return get_evidence_retriever().evaluate(list(get_ticket_classifications()))
