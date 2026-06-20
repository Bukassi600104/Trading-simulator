"""Firebase Auth identity verification (API-layer).

Identity lives in Firebase Auth. The frontend obtains a Firebase ID token; this
module verifies it on the API side and resolves it to a Supabase ``User`` row.

Design notes
------------
* Firebase ID tokens are RS256 JWTs signed by Google. They are verified against
  Google's **public** x509/JWK certificates, so only the (public) project id is
  needed — no service-account JSON in the hot path. This keeps the integration
  runnable with just ``FIREBASE_PROJECT_ID`` set.
* The verifier sits behind a small swappable surface (``verify_id_token``) so a
  self-hosted identity provider can replace Firebase later with no caller change.
* A Firebase UID maps deterministically to a Supabase user UUID via uuid5, so
  the auth hot path needs no database round-trip to produce a stable user id.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Optional

from jose import JWTError, jwt

from app.core.config import (
    FIREBASE_PROJECT_ID,
    FIREBASE_UID_NAMESPACE,
)

# Google's public JWK set for Firebase Secure Token signing.
_FIREBASE_JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/"
    "securetoken@system.gserviceaccount.com"
)
_FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/"

_jwks_keys: list = []
_jwks_last_fetched: float = 0.0
_jwks_lock = threading.Lock()

try:
    _UID_NAMESPACE = uuid.UUID(FIREBASE_UID_NAMESPACE)
except (ValueError, AttributeError, TypeError):
    _UID_NAMESPACE = uuid.NAMESPACE_URL


@dataclass
class VerifiedIdentity:
    """A successfully verified external identity."""

    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    email_verified: bool = False
    provider: str = "firebase"


def firebase_uid_to_user_uuid(firebase_uid: str) -> uuid.UUID:
    """Deterministically map a Firebase UID to a Supabase ``User`` UUID."""
    return uuid.uuid5(_UID_NAMESPACE, f"firebase:{firebase_uid}")


def _unverified_claims(token: str) -> dict:
    """Decode JWT claims without signature verification (for routing only)."""
    try:
        return jwt.get_unverified_claims(token)
    except Exception:
        return {}


def looks_like_firebase_token(token: str) -> bool:
    """Cheap check: does this token's issuer look like a Firebase token?

    Used to route between the Firebase path and the legacy Supabase/HS256 path
    without paying for signature verification first.
    """
    iss = _unverified_claims(token).get("iss", "")
    return isinstance(iss, str) and iss.startswith(_FIREBASE_ISSUER_PREFIX)


def _fetch_firebase_jwks() -> list:
    """Fetch Google's Firebase JWKS with a 1-hour in-memory cache."""
    global _jwks_keys, _jwks_last_fetched
    now = time.time()
    with _jwks_lock:
        if _jwks_keys and now - _jwks_last_fetched < 3600:
            return _jwks_keys
        try:
            with urllib.request.urlopen(_FIREBASE_JWKS_URL, timeout=5) as resp:
                data = json.loads(resp.read())
            _jwks_keys = data.get("keys", [])
            _jwks_last_fetched = now
        except Exception:
            pass  # keep stale cache on transient failure
        return _jwks_keys


def verify_id_token(token: str) -> Optional[VerifiedIdentity]:
    """Verify a Firebase ID token. Returns ``None`` if invalid or unconfigured.

    Validates signature (RS256, Google public keys), ``aud`` == project id,
    ``iss`` == ``https://securetoken.google.com/<project>``, and expiry.
    """
    if not FIREBASE_PROJECT_ID:
        return None

    expected_iss = f"{_FIREBASE_ISSUER_PREFIX}{FIREBASE_PROJECT_ID}"

    for key in _fetch_firebase_jwks():
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=FIREBASE_PROJECT_ID,
                issuer=expected_iss,
            )
        except JWTError:
            continue

        uid = payload.get("sub") or payload.get("user_id")
        if not uid:
            return None
        return VerifiedIdentity(
            uid=str(uid),
            email=payload.get("email"),
            name=payload.get("name"),
            email_verified=bool(payload.get("email_verified", False)),
            provider="firebase",
        )

    return None
