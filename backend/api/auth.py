"""Authentication and user accounts (Recruiter / Admin).

Lightweight, dependency-free auth suitable for a project prototype:
  - passwords hashed with PBKDF2-HMAC-SHA256 + per-user salt
  - stateless bearer tokens signed with HMAC (survive restarts)
  - two roles: "recruiter" (default) and "admin"
  - users persisted to <data_dir>/users.json; a seed admin is created on first run

Maps to the report's class/use-case diagrams (User entity, Recruiter vs Admin).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Dict, Optional

from fastapi import Depends, HTTPException, Request

from ..rag.config import settings

ROLES = {"recruiter", "admin"}


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
    def __init__(self):
        self.path: Path = settings.data_dir / "users.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.users: Dict[str, dict] = {}
        self._load()
        self._seed_admin()

    def _load(self):
        if self.path.exists():
            with open(self.path, "r", encoding="utf-8") as f:
                self.users = {u["username"]: u for u in json.load(f)}

    def _save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(list(self.users.values()), f, ensure_ascii=False, indent=2)

    def _seed_admin(self):
        if not self.users:
            self.users[settings.seed_admin_user] = {
                "username": settings.seed_admin_user,
                "password": hash_password(settings.seed_admin_password),
                "role": "admin",
                "created_at": int(time.time()),
            }
            self._save()

    def create(self, username: str, password: str, role: str = "recruiter") -> dict:
        username = username.strip()
        if not username or not password:
            raise HTTPException(400, "Username and password are required")
        if username in self.users:
            raise HTTPException(409, "Username already exists")
        if role not in ROLES:
            role = "recruiter"
        user = {
            "username": username,
            "password": hash_password(password),
            "role": role,
            "created_at": int(time.time()),
        }
        self.users[username] = user
        self._save()
        return user

    def authenticate(self, username: str, password: str) -> dict:
        user = self.users.get(username)
        if not user or not verify_password(password, user["password"]):
            raise HTTPException(401, "Invalid username or password")
        return user

    def public(self, user: dict) -> dict:
        return {"username": user["username"], "role": user["role"]}

    def list_public(self):
        return [self.public(u) for u in self.users.values()]


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
