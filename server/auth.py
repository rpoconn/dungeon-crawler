"""Account registration, login, logout and the current_user dependency."""

import hashlib
import hmac
import secrets
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import get_db
from models import Credentials, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

Db = Annotated[sqlite3.Connection, Depends(get_db)]


def hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)


def new_session(db: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(creds: Credentials, db: Db) -> TokenResponse:
    salt = secrets.token_bytes(16)
    try:
        cur = db.execute(
            "INSERT INTO users (username, pw_hash, salt) VALUES (?, ?, ?)",
            (creds.username, hash_password(creds.password, salt), salt),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
    assert cur.lastrowid is not None
    return TokenResponse(token=new_session(db, cur.lastrowid), username=creds.username)


@router.post("/login")
def login(creds: Credentials, db: Db) -> TokenResponse:
    row = db.execute(
        "SELECT id, pw_hash, salt FROM users WHERE username = ?", (creds.username,)
    ).fetchone()
    if row is None or not hmac.compare_digest(
        row["pw_hash"], hash_password(creds.password, row["salt"])
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    return TokenResponse(token=new_session(db, row["id"]), username=creds.username)


def current_user(
    db: Db,
    auth: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> int:
    """Resolve the bearer token to a user id, or 401."""
    if auth is not None:
        row = db.execute(
            "SELECT user_id FROM sessions WHERE token = ?", (auth.credentials,)
        ).fetchone()
        if row is not None:
            return row["user_id"]
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not logged in",
        headers={"WWW-Authenticate": "Bearer"},
    )


CurrentUser = Annotated[int, Depends(current_user)]


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: Db,
    _: CurrentUser,
    auth: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> None:
    db.execute("DELETE FROM sessions WHERE token = ?", (auth.credentials,))
