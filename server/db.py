"""SQLite connection and schema."""

import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path

DB_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "game.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    pw_hash  BLOB NOT NULL,
    salt     BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token   TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS saves (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state   TEXT NOT NULL,
    updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    writer  TEXT,
    seq     INTEGER
);
"""

# Columns added after the first release, for databases created before them.
MIGRATIONS = {
    "saves": {"writer": "TEXT", "seq": "INTEGER"},
}


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        for table, columns in MIGRATIONS.items():
            existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, committed on success."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
