import time
import uuid

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth import decode_token
from app.config import Settings
from app.main import app

SECRET = "test-secret-that-is-long-enough-for-hs256"
settings = Settings(supabase_jwt_secret=SECRET, supabase_url="")


def token(secret=SECRET, **overrides) -> str:
    claims = {"sub": str(uuid.uuid4()), "aud": "authenticated", "exp": int(time.time()) + 60}
    claims.update(overrides)
    return jwt.encode(claims, secret, algorithm="HS256")


def test_health_is_public():
    assert TestClient(app).get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("path", ["/subscriptions", "/summary", "/summary/note", "/stats/categories"])
def test_routes_require_a_token(path):
    assert TestClient(app).get(path).status_code == 401


def test_garbage_token_is_rejected():
    response = TestClient(app).get("/subscriptions", headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


async def test_valid_token_decodes():
    claims = await decode_token(token(), settings)
    assert claims["aud"] == "authenticated"


async def test_small_clock_skew_is_tolerated():
    # Supabase's clock a few seconds ahead of ours must not reject a fresh token.
    claims = await decode_token(token(iat=int(time.time()) + 5), settings)
    assert claims["aud"] == "authenticated"


@pytest.mark.parametrize(
    "bad",
    [
        token(secret="someone-elses-secret-also-long-enough"),
        token(aud="anon"),
        token(exp=int(time.time()) - 120),
    ],
)
async def test_forged_wrong_audience_or_expired_tokens_fail(bad):
    with pytest.raises(HTTPException) as exc:
        await decode_token(bad, settings)
    assert exc.value.status_code == 401
