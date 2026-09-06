"""Authentication and user accounts (Recruiter / Admin).

Users are stored in PostgreSQL (users table). The seed admin is created
automatically by DatabaseService._seed_admin_if_needed on first run.

  - passwords hashed with PBKDF2-HMAC-SHA256 + per-user salt
  - stateless bearer tokens signed with HMAC (survive restarts)
  - two roles: "recruiter" (default) and "admin"
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import Depends, HTTPException, Request

from ..rag.config import settings

ROLES = {"recruiter", "admin"}

# --- password reset tokens (in-memory, survives restarts are fine for local use)
_reset_tokens: dict = {}  # token -> {"username": str, "expiry": float}


def generate_reset_token(username: str) -> str:
    """Generate a time-limited reset token for a username."""
    import secrets
    token = secrets.token_urlsafe(32)
    _reset_tokens[token] = {
        "username": username,
        "expiry": time.time() + 3600,  # 1 hour
    }
    return token


def verify_reset_token(token: str) -> Optional[str]:
    """Verify a reset token and return the username, or None if invalid/expired."""
    data = _reset_tokens.get(token)
    if not data:
        return None
    if time.time() > data["expiry"]:
        del _reset_tokens[token]
        return None
    return data["username"]


def consume_reset_token(token: str) -> Optional[str]:
    """Verify and delete a reset token. Returns username or None."""
    username = verify_reset_token(token)
    if username:
        del _reset_tokens[token]
    return username


# --- password hashing ----------------------------------------------------
def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, _ = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, bytes.fromhex(salt_hex)), stored)


# --- tokens (HMAC-signed: username|role|expiry) --------------------------
def _sign(msg: str) -> str:
    sig = hmac.new(settings.auth_secret.encode(), msg.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")


def issue_token(username: str, role: str) -> str:
    expiry = int(time.time()) + settings.token_ttl_hours * 3600
    payload = f"{username}|{role}|{expiry}"
    b = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return f"{b}.{_sign(payload)}"


def verify_token(token: str) -> Optional[dict]:
    try:
        b, sig = token.split(".", 1)
        payload = base64.urlsafe_b64decode(b + "=" * (-len(b) % 4)).decode()
        if not hmac.compare_digest(sig, _sign(payload)):
            return None
        username, role, expiry = payload.split("|")
        if int(expiry) < int(time.time()):
            return None
        return {"username": username, "role": role}
    except Exception:
        return None


# --- user store ----------------------------------------------------------
class UserStore:
    """PostgreSQL-backed user store.

    The admin seed is created once in DatabaseService.__init__ when the users
    table is empty, so there is no seed logic here — just CRUD delegated to
    DatabaseService.
    """

    def __init__(self):
        from ..db_service import get_db_service
        self._db = get_db_service()

    def create(self, username: str, password: str, role: str = "recruiter", email: str = "") -> dict:
        username = username.strip()
        if not username or not password:
            raise HTTPException(400, "Username and password are required")
        if self._db.get_user_by_username(username):
            raise HTTPException(409, "Username already exists")
        if role not in ROLES:
            role = "recruiter"
        db_user = self._db.create_user(username, hash_password(password), role, email=email)
        return {
            "username": db_user.username,
            "email": db_user.email or "",
            "password": db_user.password_hash,
            "role": db_user.role,
            "created_at": int(db_user.created_at.timestamp()) if db_user.created_at else 0,
        }

    def authenticate(self, username: str, password: str) -> dict:
        db_user = self._db.get_user_by_username(username)
        if not db_user or not verify_password(password, db_user.password_hash):
            raise HTTPException(401, "Invalid username or password")
        return {
            "username": db_user.username,
            "email": db_user.email or "",
            "password": db_user.password_hash,
            "role": db_user.role,
            "created_at": int(db_user.created_at.timestamp()) if db_user.created_at else 0,
        }

    def google_authenticate(self, google_user: dict) -> dict:
        """Find or create a user from Google OAuth data."""
        email = google_user.get("email", "")
        name = google_user.get("name", email.split("@")[0])
        username = name.strip().lower().replace(" ", ".")

        # Check if user already exists by username
        existing = self._db.get_user_by_username(username)
        if existing:
            return {
                "username": existing.username,
                "email": existing.email or email,
                "password": existing.password_hash,
                "role": existing.role,
                "created_at": int(existing.created_at.timestamp()) if existing.created_at else 0,
            }

        # Create new user from Google data
        db_user = self._db.create_user(username, hash_password(""), "recruiter", email=email)
        return {
            "username": db_user.username,
            "email": db_user.email or email,
            "password": db_user.password_hash,
            "role": db_user.role,
            "created_at": int(db_user.created_at.timestamp()) if db_user.created_at else 0,
        }

    def public(self, user: dict) -> dict:
        return {"username": user["username"], "role": user["role"], "email": user.get("email", "")}

    def reset_password(self, username: str, new_password: str):
        """Reset a user's password."""
        db_user = self._db.get_user_by_username(username)
        if not db_user:
            raise HTTPException(404, "User not found")
        from ..db_service import get_db_service
        db = get_db_service()
        session = db.get_session()
        try:
            from ..database import User as UserModel
            u = session.query(UserModel).filter(UserModel.username == username).first()
            if u:
                u.password_hash = hash_password(new_password)
                session.commit()
        finally:
            session.close()

    def list_public(self):
        users = self._db.list_users()
        return [{"username": u.username, "role": u.role} for u in users]


_USERS: Optional[UserStore] = None


def get_users() -> UserStore:
    global _USERS
    if _USERS is None:
        _USERS = UserStore()
    return _USERS


# --- FastAPI dependencies -------------------------------------------------
def _token_from_request(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def current_user_optional(request: Request) -> Optional[dict]:
    token = _token_from_request(request)
    return verify_token(token) if token else None


def require_user(request: Request) -> dict:
    """Require a valid token only when ASSESSIQ_REQUIRE_AUTH is on. Otherwise
    allow anonymous access (returns a synthetic guest) so the demo stays open."""
    user = current_user_optional(request)
    if user:
        return user
    if settings.require_auth:
        raise HTTPException(401, "Authentication required")
    return {"username": "guest", "role": "recruiter"}


def require_admin(request: Request) -> dict:
    """Admin routes always require a valid admin token, regardless of the
    require_auth flag."""
    user = current_user_optional(request)
    if not user:
        raise HTTPException(401, "Authentication required")
    if user["role"] != "admin":
        raise HTTPException(403, "Admin privileges required")
    return user
