from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.core.config import get_settings


_REQUEST_TIMESTAMPS: dict[str, deque[float]] = defaultdict(deque)


def enforce_public_enquiry_rate_limit(request: Request) -> None:
    settings = get_settings()
    limit = settings.public_enquiry_rate_limit
    window_seconds = settings.public_enquiry_rate_window_seconds
    if limit <= 0 or window_seconds <= 0:
        return

    now = time.monotonic()
    key = _client_key(request)
    timestamps = _REQUEST_TIMESTAMPS[key]
    cutoff = now - window_seconds
    while timestamps and timestamps[0] < cutoff:
        timestamps.popleft()

    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many enquiries from this client. Please wait and try again.",
        )

    timestamps.append(now)


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
