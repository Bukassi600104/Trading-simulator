"""Unit tests for the Firebase identity layer.

These exercise the routing + deterministic-mapping logic without contacting
Google or a database.
"""

import uuid

from jose import jwt

from app.core.firebase_auth import (
    firebase_uid_to_user_uuid,
    looks_like_firebase_token,
    verify_id_token,
)


def _make_token(iss: str, sub: str = "abc123") -> str:
    return jwt.encode({"iss": iss, "sub": sub}, "test-secret", algorithm="HS256")


def test_firebase_uid_mapping_is_deterministic():
    uid = "firebase-user-xyz"
    a = firebase_uid_to_user_uuid(uid)
    b = firebase_uid_to_user_uuid(uid)
    assert a == b
    assert isinstance(a, uuid.UUID)


def test_different_uids_map_to_different_uuids():
    assert firebase_uid_to_user_uuid("a") != firebase_uid_to_user_uuid("b")


def test_looks_like_firebase_token_true_for_google_issuer():
    token = _make_token("https://securetoken.google.com/my-project")
    assert looks_like_firebase_token(token) is True


def test_looks_like_firebase_token_false_for_supabase():
    token = _make_token("https://abc.supabase.co/auth/v1")
    assert looks_like_firebase_token(token) is False


def test_looks_like_firebase_token_false_for_garbage():
    assert looks_like_firebase_token("not-a-jwt") is False


def test_verify_id_token_returns_none_without_project_config(monkeypatch):
    # When FIREBASE_PROJECT_ID is empty, verification must refuse (no silent pass).
    monkeypatch.setattr("app.core.firebase_auth.FIREBASE_PROJECT_ID", "")
    token = _make_token("https://securetoken.google.com/my-project")
    assert verify_id_token(token) is None
