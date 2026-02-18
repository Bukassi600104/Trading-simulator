# ===============================================================================
# TERMINAL ZERO - WORKER PRODUCTION DOCKERFILE
# ===============================================================================
# Handles order processing and trade execution via Redis queue
# Build context: project root (needs backend/ and worker/)
# ===============================================================================

# ---------------------------------------------------------------------------
# STAGE 1: Builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# STAGE 2: Production
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS production

LABEL maintainer="Terminal Zero <admin@terminalzero.io>"
LABEL description="Terminal Zero Worker - Order Processing Engine"

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY --chown=appuser:appuser backend/ .
COPY --chown=appuser:appuser worker/ ./worker/

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

CMD ["python", "-m", "worker.processor"]
