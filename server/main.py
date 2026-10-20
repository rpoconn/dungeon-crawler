"""FastAPI entry point: `uv run fastapi dev main.py`."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import auth
import saves
from db import init_db

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
# Built UI (`npm run build`). Served when present so one process hosts the whole game.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).parent.parent / "dist"))


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Dungeon Crawler API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(saves.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Mounted last so the API routes above (and /docs) take priority.
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="ui")
