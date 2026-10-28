"""Streamivio catalog endpoints backed by the public Supabase titles table."""
import os
import requests

ALLOWED_TYPES = {"movie", "tv", "anime", "documentary", "kids", "reality"}
SELECT = "id,title,overview,release_year,rating,type,genres,country,age_rating,poster_url"


class CatalogUnavailable(RuntimeError):
    pass


def fetch_titles():
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if not base or not key:
        raise CatalogUnavailable("Catalog database is not configured")
    response = requests.get(
        f"{base}/rest/v1/titles",
        params={"select": SELECT, "is_published": "eq.true", "order": "rating.desc.nullslast", "limit": "1000"},
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=8,
    )
    response.raise_for_status()
    rows = response.json()
    if not isinstance(rows, list):
        raise CatalogUnavailable("Catalog database returned an invalid response")
    return rows


def normalize(row):
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "name": row.get("title"),
        "overview": row.get("overview") or "",
        "year": row.get("release_year"),
        "rating": row.get("rating"),
        "type": row.get("type"),
        "genres": row.get("genres") or [],
        "country": row.get("country") or [],
        "age_rating": row.get("age_rating"),
        "poster_url": row.get("poster_url"),
        "source": "Streamivio catalog",
        "playback_available": False,
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
        rows = [r for r in rows if q in (r["title"] or "").casefold() or q in r["overview"].casefold()]
    if media_type:
        rows = [r for r in rows if r["type"] == media_type]
    if genre:
        rows = [r for r in rows if any(genre == str(g).casefold() for g in r["genres"])]
    if country:
        rows = [r for r in rows if any(country == str(c).casefold() for c in r["country"])]
    if year_text:
        rows = [r for r in rows if str(r["year"] or "") == year_text]

    if sort == "title":
        rows.sort(key=lambda r: (r["title"] or "").casefold())
    elif sort == "year":
        rows.sort(key=lambda r: r["year"] or 0, reverse=True)
    else:
        rows.sort(key=lambda r: r["rating"] if r["rating"] is not None else -1, reverse=True)

    total = len(rows)
    offset, limit = int(offset_text), int(limit_text)
    return {"results": rows[offset:offset + limit], "total": total, "limit": limit, "offset": offset}


def get_categories():
    rows = fetch_titles()
    counts = {}
    for row in rows:
        kind = row.get("type")
        if kind in ALLOWED_TYPES:
            counts[kind] = counts.get(kind, 0) + 1
    return {"categories": [{"type": kind, "count": counts.get(kind, 0)} for kind in sorted(ALLOWED_TYPES)]}


def get_genres():
    rows = fetch_titles()
    genres = sorted({str(genre) for row in rows for genre in (row.get("genres") or [])}, key=str.casefold)
    return {"genres": genres}


def get_featured():
    rows = [normalize(row) for row in fetch_titles()]
    rows.sort(key=lambda row: row["rating"] if row["rating"] is not None else -1, reverse=True)
    return {"results": rows[:12], "total": len(rows)}
