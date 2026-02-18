# ===============================================================================
# TERMINAL ZERO - API PRODUCTION DOCKERFILE
# ===============================================================================
# Multi-stage build for optimized production image
# Build context: backend/
# ===============================================================================

# ---------------------------------------------------------------------------
# STAGE 1: Builder - Install dependencies in a virtual environment
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# STAGE 2: Production - Minimal runtime image
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS production

LABEL maintainer="Terminal Zero <admin@terminalzero.io>"
LABEL description="Terminal Zero Trading Simulator API"

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY --chown=appuser:appuser . .

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DEBUG=false

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop", "--http", "httptools"]
