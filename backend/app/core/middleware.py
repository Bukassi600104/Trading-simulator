"""
Custom Middleware for Terminal Zero
"""
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
                    # Client sends timestamp in milliseconds
                    client_time = int(client_ts)
                    server_time = int(time.time() * 1000)
                    latency = server_time - client_time
                    
                    if latency > self.max_latency_ms:
                        logger.warning(f"Latency Guard: Rejected request with {latency}ms latency")
                        return JSONResponse(
                            status_code=400,
                            content={"detail": f"Request too old ({latency}ms > {self.max_latency_ms}ms). Check your clock."}
                        )
                    
                    # Also reject future timestamps (clock skew)
                    if latency < -1000: # Allow 1s skew
                         logger.warning(f"Latency Guard: Rejected future timestamp {latency}ms")
                         return JSONResponse(
                            status_code=400,
                            content={"detail": "Invalid timestamp (in future). Check your clock."}
                        )
                        
                except ValueError:
                    pass # Ignore invalid headers, let it pass or handle strictly
        
        return await call_next(request)
