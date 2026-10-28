"""Streamivio direct-play resolver.

Resolves only media URLs explicitly configured in Streamivio's own catalog.
It intentionally does not scrape third-party players, bypass access controls,
or proxy video bytes. Configure STREAMIVIO_CATALOG_PATH to a JSON catalog
whose entries contain imdb_id and an authorized HTTPS video_url.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import time
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

APP_DIR = Path(__file__).resolve().parent
CATALOG_PATH = Path(os.getenv("STREAMIVIO_CATALOG_PATH", str(APP_DIR.parent / "pymoviedb-service" / "data" / "catalog.json")))
CACHE_PATH = Path(os.getenv("STREAMIVIO_STREAM_CACHE", str(APP_DIR / "stream_cache.sqlite3")))
CACHE_TTL_SECONDS = max(30, int(os.getenv("STREAMIVIO_CACHE_TTL", "300")))
IMDB_RE = re.compile(r"^tt[0-9]+$", re.I)

app = FastAPI(title="Streamivio Authorized Stream Resolver", version="1.0.0")
origins = [value.strip() for value in os.getenv("STREAMIVIO_CORS_ORIGINS", "").split(",") if value.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(CACHE_PATH)
    connection.execute("CREATE TABLE IF NOT EXISTS stream_cache (imdb_id TEXT PRIMARY KEY, stream_url TEXT NOT NULL, media_format TEXT NOT NULL, cached_at INTEGER NOT NULL)")
    return connection


def valid_https_url(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlsplit(value.strip())
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def media_format(url: str) -> str:
    path = urlsplit(url).path.lower()
    if path.endswith(".m3u8"):
        return "hls"
    if path.endswith(".mp4"):
        return "mp4"
    return "external"


def read_catalog() -> list[dict]:
    try:
        payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Catalog file not found; configure STREAMIVIO_CATALOG_PATH.")
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail=f"Catalog could not be read: {exc}")
    if isinstance(payload, dict):
        payload = payload.get("titles", payload.get("results", []))
    if not isinstance(payload, list):
        raise HTTPException(status_code=503, detail="Catalog must be a JSON array or an object containing titles/results.")
    return [item for item in payload if isinstance(item, dict)]


@app.get("/health")
def health():
    return {"status": "ok", "service": "streamivio-authorized-resolver", "scraping": False, "proxying": False}


@app.get("/stream/{imdb_id}")
def stream(imdb_id: str):
    if not IMDB_RE.fullmatch(imdb_id):
        raise HTTPException(status_code=400, detail="Expected an IMDb ID such as tt0133093.")
    imdb_id = imdb_id.lower()
    now = int(time.time())
    with db() as connection:
        cached = connection.execute(
            "SELECT stream_url, media_format, cached_at FROM stream_cache WHERE imdb_id = ?", (imdb_id,)
        ).fetchone()
        if cached and now - cached[2] < CACHE_TTL_SECONDS and valid_https_url(cached[0]):
            return {"imdb_id": imdb_id, "available": True, "stream_url": cached[0], "format": cached[1], "cached": True}

    entry = next((item for item in read_catalog() if str(item.get("imdb_id", item.get("imdbId", ""))).lower() == imdb_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="No catalog item is mapped to this IMDb ID.")
    url = entry.get("video_url")
    if not valid_https_url(url):
        raise HTTPException(status_code=404, detail="No authorized HTTPS video_url is configured for this title.")
    fmt = media_format(url)
    with db() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO stream_cache (imdb_id, stream_url, media_format, cached_at) VALUES (?, ?, ?, ?)",
            (imdb_id, url, fmt, now),
        )
    return {"imdb_id": imdb_id, "available": True, "stream_url": url, "format": fmt, "cached": False}


@app.delete("/cache")
def clear_cache():
    # This endpoint is intended for a private/admin-only deployment.
    with db() as connection:
        connection.execute("DELETE FROM stream_cache")
    return {"cleared": True}
