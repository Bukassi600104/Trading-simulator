import pytest
from app.core.security import verify_password, hash_password, get_user_id_from_token, TokenData

def test_password_hashing_and_verification():
    password = "MySecurePassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False
    assert verify_password(password, "managed-by-supabase") is False

def test_get_user_id_from_token():
    valid_uuid_str = "123e4567-e89b-12d3-a456-426614174000"
    token = TokenData(user_id=valid_uuid_str, email="test@example.com", exp=None)
    uid = get_user_id_from_token(token)
    assert str(uid) == valid_uuid_str

    # Test fallback to demo user ID when token is None
    uid_fallback = get_user_id_from_token(None)
    assert str(uid_fallback) == "00000000-0000-0000-0000-000000000001"
