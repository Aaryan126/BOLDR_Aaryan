from functools import lru_cache

from app.intelligence.classifier import classify_tickets, evaluate_classifications
from app.models.classification import ClassificationEvaluation, TicketClassification
from app.services.datasets import get_dataset_snapshot


@lru_cache
def get_ticket_classifications() -> tuple[TicketClassification, ...]:
    snapshot = get_dataset_snapshot()
    return tuple(classify_tickets(snapshot.tickets))


def list_ticket_classifications() -> list[TicketClassification]:
    return list(get_ticket_classifications())


def get_ticket_classification(ticket_id: str) -> TicketClassification | None:
    normalized_ticket_id = ticket_id.upper()
    return next(
        (
            classification
            for classification in get_ticket_classifications()
            if classification.ticket_id.upper() == normalized_ticket_id
        ),
        None,
    )


@lru_cache
def get_classification_evaluation() -> ClassificationEvaluation:
    return evaluate_classifications(list(get_ticket_classifications()))
