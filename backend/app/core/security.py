import uuid
import redis as redis_lib  # type: ignore[import]
from datetime import datetime, timedelta, timezone
from importlib import import_module
from typing import Optional
from cryptography.hazmat.primitives import serialization  # type: ignore[import]
from cryptography.hazmat.primitives.asymmetric import rsa  # type: ignore[import]
from cryptography.hazmat.backends import default_backend  # type: ignore[import]
from jose import jwt # type: ignore
from jose.exceptions import JWTError # type: ignore
from passlib.context import CryptContext  # type: ignore[import]
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def _get_pyotp():
    try:
        return import_module("pyotp")
    except ImportError as exc:
        raise ImportError("pyotp is required for TOTP operations") from exc

# Import pyotp module (raise if missing)
pyotp = _get_pyotp()

# RSA key generation (done once at module level for dev; load from env/secret in prod)
_private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend(),
)
_public_key = _private_key.public_key()

PRIVATE_KEY_PEM = _private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)

PUBLIC_KEY_PEM = _public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)

_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def hash_password(password):
    return pwd_context.hash(password[:72])



def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, PRIVATE_KEY_PEM, algorithm="RS256")


def create_refresh_token(user_id: str) -> str:
    jti = str(uuid.uuid4())
    expire_seconds = settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600
    r = get_redis()
    r.setex(f"refresh:{jti}", expire_seconds, user_id)
    to_encode = {
        "sub": user_id,
        "jti": jti,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(to_encode, PRIVATE_KEY_PEM, algorithm="RS256")


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=["RS256"])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


def verify_refresh_token(token: str) -> str:
    try:
        payload = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=["RS256"])
        jti = payload.get("jti")
        r = get_redis()
        user_id = r.get(f"refresh:{jti}")
        if not user_id:
            raise ValueError("Refresh token revoked or expired")
        return user_id
    except JWTError as e:
        raise ValueError(f"Invalid refresh token: {e}")


def revoke_refresh_token(token: str):
    try:
        payload = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=["RS256"])
        jti = payload.get("jti")
        if jti:
            r = get_redis()
            r.delete(f"refresh:{jti}")
    except JWTError:
        pass


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, token: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)


def get_totp_uri(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="SDPS Digital Bank")


def create_temp_token(user_id: str) -> str:
    """Create a short-lived token for MFA step-up (5 minute TTL)."""
    jti = str(uuid.uuid4())
    r = get_redis()
    r.setex(f"mfa_temp:{jti}", 300, user_id)
    to_encode = {
        "sub": user_id,
        "jti": jti,
        "type": "mfa_temp",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    return jwt.encode(to_encode, PRIVATE_KEY_PEM, algorithm="RS256")


def verify_temp_token(token: str) -> str:
    try:
        payload = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=["RS256"])
        if payload.get("type") != "mfa_temp":
            raise ValueError("Not a temp token")
        jti = payload.get("jti")
        r = get_redis()
        user_id = r.get(f"mfa_temp:{jti}")
        if not user_id:
            raise ValueError("Temp token expired or already used")
        r.delete(f"mfa_temp:{jti}")
        return user_id
    except JWTError as e:
        raise ValueError(f"Invalid temp token: {e}")
