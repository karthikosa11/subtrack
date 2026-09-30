import uuid
from datetime import date, datetime, timezone
from functools import lru_cache

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True)


def _unauthorized() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again to continue.")


async def decode_token(token: str, settings: Settings) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            # Legacy Supabase projects sign with a shared secret.
            if not settings.supabase_jwt_secret:
                raise _unauthorized()
            key = settings.supabase_jwt_secret
            algorithms = ["HS256"]
        else:
            if not settings.supabase_url:
                raise _unauthorized()
            signing_key = await run_in_threadpool(
                _jwks_client(settings.supabase_url).get_signing_key_from_jwt, token
            )
            key = signing_key.key
            algorithms = ["RS256", "ES256"]
        # Leeway covers small clock differences between this machine and Supabase;
        # without it a fresh token can look "issued in the future" and get rejected.
        return jwt.decode(token, key, algorithms=algorithms, audience="authenticated", leeway=60)
    except (jwt.PyJWTError, ValueError) as exc:
        raise _unauthorized() from exc


async def current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> uuid.UUID:
    if creds is None:
        raise _unauthorized()
    claims = await decode_token(creds.credentials, settings)
    try:
        return uuid.UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise _unauthorized() from exc


def local_today(x_local_date: str | None = Header(default=None)) -> date:
    """The user's calendar date, sent by the app so renewals match their timezone."""
    if x_local_date:
        try:
            return date.fromisoformat(x_local_date)
        except ValueError:
            pass
    return datetime.now(timezone.utc).date()
