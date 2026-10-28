"""Standalone JSON-backed Streamivio catalog API (no external database required)."""
import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent / "data" / "catalog.json"
ALLOWED_TYPES = {"movie", "tv", "anime", "documentary", "kids", "reality"}


class CatalogUnavailable(RuntimeError):
    pass


def fetch_titles():
    try:
        payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        rows = payload.get("titles", [])
    except (OSError, json.JSONDecodeError) as error:
        raise CatalogUnavailable("The bundled JSON catalog could not be read") from error
    if not isinstance(rows, list):
        raise CatalogUnavailable("The JSON catalog must contain a titles array")
    return [row for row in rows if isinstance(row, dict) and row.get("published", True)]


def normalize_facet(value):
    """Normalize labels so Sci-Fi and sci_fi compare equally."""
    return "".join(character for character in str(value).casefold() if character.isalnum())


def normalize(row):
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "name": row.get("title"),
        "overview": row.get("overview") or row.get("description") or "",
        "description": row.get("overview") or row.get("description") or "",
        "year": row.get("year"),
        "rating": row.get("rating"),
        "type": row.get("type"),
        "genres": row.get("genres") or [],
        "country": row.get("country") or [],
        "age_rating": row.get("age_rating"),
        "poster_url": row.get("poster_url"),
        "poster": row.get("poster_url"),
        "source": row.get("source") or "Streamivio Library",
        "playback_available": bool(row.get("video_url")),
    }


def get_catalog(params):
    q = (params.get("q") or [""])[0].strip().casefold()
    media_type = (params.get("type") or [""])[0].strip().casefold()
    genre = (params.get("genre") or [""])[0].strip().casefold()
    country = (params.get("country") or [""])[0].strip().casefold()
    year_text = (params.get("year") or [""])[0].strip()
    sort = (params.get("sort") or ["rating"])[0].strip().casefold()
    limit_text = (params.get("limit") or ["30"])[0].strip()
    offset_text = (params.get("offset") or ["0"])[0].strip()

    if len(q) > 100 or (q and len(q) < 2):
        raise ValueError("q must be between 2 and 100 characters")
    if media_type and media_type not in ALLOWED_TYPES:
        raise ValueError("type must be movie, tv, anime, documentary, kids, or reality")
    if year_text and (not year_text.isdigit() or not 1888 <= int(year_text) <= 2200):
        raise ValueError("year must be a valid four-digit release year")
    if sort not in {"rating", "year", "title"}:
        raise ValueError("sort must be rating, year, or title")
    if not limit_text.isdigit() or not 1 <= int(limit_text) <= 100:
        raise ValueError("limit must be between 1 and 100")
    if not offset_text.isdigit() or int(offset_text) > 100000:
        raise ValueError("offset must be between 0 and 100000")

    rows = [normalize(row) for row in fetch_titles()]
    if q:
        rows = [r for r in rows if q in (r["title"] or "").casefold()
                or q in r["overview"].casefold()]
    if media_type:
        rows = [r for r in rows if r["type"] == media_type]
    if genre:
        wanted_genre = normalize_facet(genre)
        rows = [
            r for r in rows
            if any(wanted_genre == normalize_facet(g) for g in r["genres"])
        ]
    if country:
        rows = [r for r in rows if any(country == str(c).casefold() for c in r["country"])]
    if year_text:
        rows = [r for r in rows if str(r["year"] or "") == year_text]

    if sort == "title":
        rows.sort(key=lambda r: (r["title"] or "").casefold())
    elif sort == "year":
        rows.sort(key=lambda r: int(r["year"] or 0), reverse=True)
    else:
        rows.sort(key=lambda r: r["rating"] if r["rating"] is not None else -1, reverse=True)

    total = len(rows)
    offset, limit = int(offset_text), int(limit_text)
    return {"results": rows[offset:offset + limit], "total": total, "limit": limit, "offset": offset}


def get_categories():
    rows = fetch_titles()
    counts = {kind: sum(1 for row in rows if row.get("type") == kind) for kind in sorted(ALLOWED_TYPES)}
    return {"categories": [{"type": kind, "count": count} for kind, count in counts.items()]}


def get_genres():
    genres = sorted({str(g) for row in fetch_titles() for g in (row.get("genres") or [])}, key=str.casefold)
    return {"genres": genres}


def get_featured():
    rows = [normalize(row) for row in fetch_titles()]
    rows.sort(key=lambda row: row["rating"] if row["rating"] is not None else -1, reverse=True)
    return {"results": rows[:12], "total": len(rows)}
