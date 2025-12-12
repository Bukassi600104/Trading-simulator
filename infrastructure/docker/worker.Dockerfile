# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - WORKER (JESSE ENGINE) DOCKERFILE
# ═══════════════════════════════════════════════════════════════════════════════
# Handles order processing and trade execution
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Production Stage
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim as production

LABEL maintainer="Terminal Zero <admin@terminalzero.io>"
LABEL description="Terminal Zero Worker - Order Processing Engine"

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy backend code (worker needs access to models and jesse_custom)
COPY --chown=appuser:appuser backend/ .
COPY --chown=appuser:appuser worker/ ./worker/

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

# Worker doesn't expose a port - it consumes from Redis queue
CMD ["python", "-m", "worker.processor"]
