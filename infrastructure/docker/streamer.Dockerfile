# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - MARKET STREAMER DOCKERFILE
# ═══════════════════════════════════════════════════════════════════════════════
# Connects to Bybit WebSocket and pushes prices to Redis Pub/Sub
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Minimal requirements for streamer
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
    redis>=5.0.3 \
    websockets>=12.0 \
    httpx>=0.27.0 \
    loguru>=0.7.2 \
    python-dotenv>=1.0.0

# ─────────────────────────────────────────────────────────────────────────────
# Production Stage
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim as production

LABEL maintainer="Terminal Zero <admin@terminalzero.io>"
LABEL description="Terminal Zero Market Streamer - Real-time Price Feed"

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only the market stream service
COPY --chown=appuser:appuser backend/services/market_stream.py ./services/
COPY --chown=appuser:appuser backend/app/core/config.py ./app/core/

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

# Health check - verify Redis connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import redis; r = redis.from_url('$REDIS_URL'); r.ping()" || exit 1

CMD ["python", "-m", "services.market_stream"]
