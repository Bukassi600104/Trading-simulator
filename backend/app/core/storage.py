"""Object storage abstraction.

Replaces AWS S3 with Cloudflare R2 (S3-compatible) for Parquet historicals and
trade screenshots. Sits behind a small swappable interface so the rest of the
codebase never imports a cloud SDK directly. Falls back to local disk when R2
is not configured, so development needs no cloud credentials.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Protocol, runtime_checkable

from loguru import logger

from app.core.config import (
    R2_ACCESS_KEY_ID,
    R2_BUCKET,
    R2_ENABLED,
    R2_ENDPOINT,
    R2_PUBLIC_BASE_URL,
    R2_SECRET_ACCESS_KEY,
)


@runtime_checkable
class StorageBackend(Protocol):
    """Minimal object-storage surface used across the app."""

    def upload_bytes(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        """Store ``data`` at ``key`` and return a retrievable URL."""
        ...

    def public_url(self, key: str) -> str:
        """Return the public URL for an existing object key."""
        ...


class R2Storage:
    """Cloudflare R2 backend via the S3-compatible API (boto3)."""

    def __init__(self) -> None:
        import boto3  # imported lazily so dev installs need no boto3

        self._bucket = R2_BUCKET
        self._public_base = R2_PUBLIC_BASE_URL.rstrip("/") if R2_PUBLIC_BASE_URL else ""
        self._client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    def upload_bytes(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        self._client.put_object(
            Bucket=self._bucket, Key=key, Body=data, ContentType=content_type
        )
        return self.public_url(key)

    def public_url(self, key: str) -> str:
        if self._public_base:
            return f"{self._public_base}/{key}"
        return f"{R2_ENDPOINT}/{self._bucket}/{key}"


class LocalStorage:
    """Local-disk fallback used when R2 is not configured (development)."""

    def __init__(self, root: Optional[str] = None) -> None:
        self._root = Path(root or os.getenv("LOCAL_STORAGE_DIR", "./.localstorage"))
        self._root.mkdir(parents=True, exist_ok=True)

    def upload_bytes(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        path = self._root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return self.public_url(key)

    def public_url(self, key: str) -> str:
        return f"/local-storage/{key}"


_storage: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    """Return the configured storage backend singleton (R2 or local disk)."""
    global _storage
    if _storage is None:
        if R2_ENABLED:
            try:
                _storage = R2Storage()
                logger.info("🗄️  Storage backend: Cloudflare R2")
            except Exception as e:  # pragma: no cover - missing boto3/creds
                logger.warning(f"R2 storage unavailable ({e}); using local disk")
                _storage = LocalStorage()
        else:
            _storage = LocalStorage()
            logger.info("🗄️  Storage backend: local disk (R2 not configured)")
    return _storage
