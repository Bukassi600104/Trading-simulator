"""Vercel serverless entrypoint for the Terminal Zero FastAPI app.

Vercel's Python runtime (Fluid Compute) discovers the module-level ASGI ``app``
and serves it. All routes are rewritten here via ``backend/vercel.json``.

Note: persistent background workers and WebSocket streaming do NOT run on
serverless — they are auto-disabled here (see ``main._background_workers_enabled``)
and live on the persistent host (the VPS). This entrypoint serves the stateless
REST API only.
"""

from main import app  # noqa: F401  (ASGI app served by Vercel)
