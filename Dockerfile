FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml backend/uv.lock ./backend/

WORKDIR /app/backend
RUN uv sync --frozen --no-dev

WORKDIR /app
COPY backend ./backend
COPY ["Boldr Data", "./Boldr Data"]

WORKDIR /app/backend

CMD ["sh", "-c", "exec uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
