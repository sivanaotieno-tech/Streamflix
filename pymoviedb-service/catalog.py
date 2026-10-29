"""Standalone JSON-backed Streamivio catalog and relevance-ranked search API."""
import json
import re
import unicodedata
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent / "data" / "catalog.json"
ALLOWED_TYPES = {"movie", "tv", "anime", "documentary", "kids", "reality"}
STOP_WORDS = {"a", "an", "and", "are", "at", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with"}


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


def fold_text(value):
    """Make search insensitive to accents, case, punctuation and repeated whitespace."""
    decomposed = unicodedata.normalize("NFKD", str(value or "").casefold())
    unaccented = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return " ".join(re.findall(r"[a-z0-9]+", unaccented))


def compact_text(value):
    return "".join(fold_text(value).split())


def normalize_facet(value):
    """Normalize labels so Sci-Fi, sci_fi and sci fi compare equally."""
    return compact_text(value)


def _as_text_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if item is not None and str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [part.strip() for part in re.split(r"[,|]", value) if part.strip()]
    return []


def normalize(row):
    overview = row.get("overview") or row.get("description") or ""
    genres = _as_text_list(row.get("genres"))
    country = _as_text_list(row.get("country"))
    aliases = _as_text_list(row.get("alternate_titles") or row.get("aliases") or row.get("aka"))
    keywords = _as_text_list(row.get("keywords") or row.get("tags"))
    cast = _as_text_list(row.get("cast") or row.get("actors"))
    directors = _as_text_list(row.get("directors") or row.get("director"))
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "name": row.get("title"),
        "original_title": row.get("original_title") or row.get("originalTitle") or row.get("title"),
        "alternate_titles": aliases,
        "overview": overview,
        "description": overview,
        "year": row.get("year"),
        "rating": row.get("rating"),
        "type": row.get("type"),
        "genres": genres,
        "keywords": keywords,
        "country": country,
        "age_rating": row.get("age_rating"),
        "poster_url": row.get("poster_url"),
        "poster": row.get("poster_url"),
        "cast": cast,
        "directors": directors,
        "source": row.get("source") or "Streamivio Library",
        "playback_available": bool(row.get("video_url")),
    }


def _edit_distance_within(left, right, limit):
    """Return edit distance when it is small enough; otherwise return limit + 1."""
    if left == right:
        return 0
    if abs(len(left) - len(right)) > limit:
        return limit + 1
    if not left or not right:
        return max(len(left), len(right))
    previous = list(range(len(right) + 1))
    for i, char_left in enumerate(left, 1):
        current = [i]
        for j, char_right in enumerate(right, 1):
            current.append(min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + (char_left != char_right),
            ))
        previous = current
    return previous[-1] if previous[-1] <= limit else limit + 1


def _word_match_score(query_word, candidate_words):
    best = 0
    for word in candidate_words:
        if word == query_word:
            best = max(best, 40)
        elif len(query_word) >= 3 and word.startswith(query_word):
            best = max(best, 28)
        elif len(query_word) >= 4 and query_word.startswith(word):
            best = max(best, 20)
        elif len(query_word) >= 4 and len(word) >= 4 and (query_word in word or word in query_word):
            best = max(best, 16)
        elif len(query_word) >= 4:
            tolerance = 1 if len(query_word) <= 7 else 2
            if _edit_distance_within(query_word, word, tolerance) <= tolerance:
                best = max(best, 12)
    return best


def _search_document(row):
    title_fields = [
        row.get("title"),
        row.get("original_title"),
        *_as_text_list(row.get("alternate_titles")),
        *_as_text_list(row.get("aliases")),
        *_as_text_list(row.get("aka")),
    ]
    metadata_fields = [
        row.get("overview"),
        row.get("description"),
        row.get("type"),
        row.get("age_rating"),
        *_as_text_list(row.get("genres")),
        *_as_text_list(row.get("keywords")),
        *_as_text_list(row.get("tags")),
        *_as_text_list(row.get("country")),
        *_as_text_list(row.get("cast")),
        *_as_text_list(row.get("actors")),
        *_as_text_list(row.get("directors")),
        *_as_text_list(row.get("director")),
        row.get("year"),
    ]
    return title_fields, metadata_fields


def _search_score(row, query):
    folded_query = fold_text(query)
    compact_query = compact_text(query)
    query_words = [word for word in folded_query.split() if word not in STOP_WORDS]
    if not query_words:
        query_words = folded_query.split()
    title_fields, metadata_fields = _search_document(row)
    title_text = fold_text(row.get("title"))
    compact_title = compact_text(row.get("title"))
    title_candidates = [fold_text(value) for value in title_fields if value]
    metadata_candidates = [fold_text(value) for value in metadata_fields if value]
    score = 0

    if compact_query and compact_query == compact_title:
        score += 1200
    elif compact_query and compact_title.startswith(compact_query):
        score += 850
    elif compact_query and compact_query in compact_title:
        score += 650
    elif folded_query and folded_query in title_text:
        score += 550

    if folded_query:
        if any(folded_query in value for value in title_candidates[1:]):
            score += 400
        if any(folded_query in value for value in metadata_candidates):
            score += 45

    matched_words = 0
    for word in query_words:
        title_word_score = max(
            (_word_match_score(word, value.split()) for value in title_candidates),
            default=0,
        )
        metadata_word_score = max(
            (_word_match_score(word, value.split()) for value in metadata_candidates),
            default=0,
        )
        if title_word_score:
            score += title_word_score + 24
            matched_words += 1
        elif metadata_word_score:
            score += max(5, metadata_word_score // 2)
            matched_words += 1

    if query_words:
        score += int(100 * matched_words / len(query_words))
    return score if matched_words or (compact_query and compact_query in compact_title) else 0


def get_catalog(params):
    q = (params.get("q") or [""])[0].strip()
    media_type = (params.get("type") or [""])[0].strip().casefold()
    genre = (params.get("genre") or [""])[0].strip().casefold()
    country = (params.get("country") or [""])[0].strip().casefold()
    year_text = (params.get("year") or [""])[0].strip()
    sort = (params.get("sort") or [""])[0].strip().casefold()
    limit_text = (params.get("limit") or ["30"])[0].strip()
    offset_text = (params.get("offset") or ["0"])[0].strip()

    if len(q) > 100 or (q and len(q) < 2):
        raise ValueError("q must be between 2 and 100 characters")
    if media_type and media_type not in ALLOWED_TYPES:
        raise ValueError("type must be movie, tv, anime, documentary, kids, or reality")
    if year_text and (not year_text.isdigit() or not 1888 <= int(year_text) <= 2200):
        raise ValueError("year must be a valid four-digit release year")
    if sort not in {"", "relevance", "rating", "year", "title"}:
        raise ValueError("sort must be relevance, rating, year, or title")
    if not limit_text.isdigit() or not 1 <= int(limit_text) <= 100:
        raise ValueError("limit must be between 1 and 100")
    if not offset_text.isdigit() or int(offset_text) > 100000:
        raise ValueError("offset must be between 0 and 100000")

    rows = [normalize(row) for row in fetch_titles()]
    if media_type:
        rows = [row for row in rows if row["type"] == media_type]
    if genre:
        wanted_genre = normalize_facet(genre)
        rows = [
            row for row in rows
            if any(wanted_genre == normalize_facet(g) for g in row["genres"])
        ]
    if country:
        wanted_country = normalize_facet(country)
        us_aliases = {"usa", "unitedstates", "us", "unitedstatesofamerica"}
        uk_aliases = {"uk", "unitedkingdom", "greatbritain", "britain"}
        if wanted_country in us_aliases:
            accepted_countries = us_aliases
        elif wanted_country in uk_aliases:
            accepted_countries = uk_aliases
        else:
            accepted_countries = {wanted_country}
        rows = [
            row for row in rows
            if any(
                normalize_facet(value) in accepted_countries
                or any(normalize_facet(value).startswith(alias) for alias in accepted_countries if len(alias) >= 4)
                for value in row["country"]
            )
        ]
    if year_text:
        rows = [row for row in rows if str(row["year"] or "") == year_text]

    if q:
        ranked = []
        for row in rows:
            score = _search_score(row, q)
            if score:
                row["match_score"] = score
                ranked.append(row)
        rows = ranked

    if sort == "title":
        rows.sort(key=lambda row: (row["title"] or "").casefold())
    elif sort == "year":
        rows.sort(key=lambda row: int(row["year"] or 0), reverse=True)
    elif sort == "rating":
        rows.sort(key=lambda row: row["rating"] if row["rating"] is not None else -1, reverse=True)
    elif q:
        rows.sort(key=lambda row: (
            row.get("match_score", 0),
            row["rating"] if row["rating"] is not None else -1,
            (row["title"] or "").casefold(),
        ), reverse=True)
    else:
        rows.sort(key=lambda row: row["rating"] if row["rating"] is not None else -1, reverse=True)

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
