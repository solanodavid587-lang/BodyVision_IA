import base64
import hashlib
import hmac
import json
import secrets
import time

from app.core.config import settings

PASSWORD_ITERATIONS = 310_000
SESSION_MAX_AGE = 60 * 60 * 12


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PASSWORD_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(digest).decode(),
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = password_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(encoded_salt)
        expected = base64.urlsafe_b64decode(encoded_digest)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt, int(iterations)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


def create_session_token(user_id: int, session_version: int) -> str:
    payload = json.dumps(
        {
            "sub": user_id,
            "ver": session_version,
            "exp": int(time.time()) + SESSION_MAX_AGE,
        },
        separators=(",", ":"),
    ).encode()
    encoded_payload = base64.urlsafe_b64encode(payload).rstrip(b"=")
    signature = hmac.new(
        settings.auth_secret_key.encode(), encoded_payload, hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=")
    return f"{encoded_payload.decode()}.{encoded_signature.decode()}"


def read_session_token(token: str) -> tuple[int, int] | None:
    try:
        encoded_payload, encoded_signature = token.split(".", maxsplit=1)
        expected_signature = hmac.new(
            settings.auth_secret_key.encode(),
            encoded_payload.encode(),
            hashlib.sha256,
        ).digest()
        signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        if not hmac.compare_digest(signature, expected_signature):
            return None
        payload_bytes = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )
        payload = json.loads(payload_bytes)
        if int(payload["exp"]) <= int(time.time()):
            return None
        return int(payload["sub"]), int(payload.get("ver", 0))
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return None