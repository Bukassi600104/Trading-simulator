"""
Custom Middleware for Terminal Zero
"""
import re
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class LatencyGuardMiddleware(BaseHTTPMiddleware):
    """
    Anti-Cheat Middleware
    Rejects requests that are too old (preventing replay attacks or lag exploitation)
    """
    def __init__(self, app: ASGIApp, max_latency_ms: int = 500):
        super().__init__(app)
        self.max_latency_ms = max_latency_ms

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only check trading endpoints
        if request.url.path.startswith("/api/trading/orders") and request.method == "POST":
            client_ts = request.headers.get("X-Client-Timestamp")

            if client_ts:
                try:
                    client_time = int(client_ts)
                    server_time = int(time.time() * 1000)
                    latency = server_time - client_time

                    if latency > self.max_latency_ms:
                        logger.warning(f"Latency Guard: Rejected request with {latency}ms latency")
                        return JSONResponse(
                            status_code=400,
                            content={"detail": f"Request too old ({latency}ms > {self.max_latency_ms}ms). Check your clock."}
                        )

                    if latency < -1000:
                         logger.warning(f"Latency Guard: Rejected future timestamp {latency}ms")
                         return JSONResponse(
                            status_code=400,
                            content={"detail": "Invalid timestamp (in future). Check your clock."}
                        )

                except ValueError:
                    pass

        return await call_next(request)


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Reject requests with common injection patterns in query parameters and path.

    This is a defence-in-depth layer. Application-level validation (Pydantic,
    parameterised queries) is the primary defence.
    """

    # Patterns that should never appear in normal API input
    _DANGEROUS_PATTERNS = [
        re.compile(r"<\s*script", re.IGNORECASE),        # XSS script tags
        re.compile(r"javascript\s*:", re.IGNORECASE),     # javascript: URIs
        re.compile(r"on\w+\s*=", re.IGNORECASE),         # inline event handlers
        re.compile(r";\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\s", re.IGNORECASE),  # SQL injection fragments
        re.compile(r"(\b|')OR\s+1\s*=\s*1", re.IGNORECASE),  # classic SQL injection
        re.compile(r"UNION\s+(ALL\s+)?SELECT", re.IGNORECASE),  # UNION injection
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check query string
        raw_query = str(request.url.query or "")
        path = request.url.path

        for pattern in self._DANGEROUS_PATTERNS:
            if pattern.search(raw_query) or pattern.search(path):
                logger.warning(
                    f"Input sanitization: blocked suspicious request "
                    f"path={path} query={raw_query[:200]}"
                )
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Request contains invalid characters"},
                )

        return await call_next(request)
