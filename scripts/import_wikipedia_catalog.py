#!/usr/bin/env python3
"""Safely merge Wikipedia movie-scraper exports into Streamivio's JSON catalog.

Accepts CSV (the scraper's documented output) or JSON exports. Existing manual
records and playback URLs are preserved. This imports metadata only; it never
adds video URLs or claims streaming rights.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "pymoviedb-service" / "data" / "catalog.json"


def key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower())


def slug(value: Any) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()).strip("-")
    return result[:70] or "untitled"


def split_list(value: Any) -> list[str]:
    if isinstance(value, list):
        parts = value
    else:
        parts = re.split(r"\s*[;,|]\s*", str(value or ""))
    seen: set[str] = set()
    output: list[str] = []
    for part in parts:
        item = str(part or "").strip()
        if item and key(item) not in seen:
            seen.add(key(item))
            output.append(item)
    return output


def first(row: dict[str, Any], *names: str) -> Any:
    indexed = {key(k): v for k, v in row.items()}
    for name in names:
        value = indexed.get(key(name))
        if value is not None and str(value).strip():
            return value
    return None


def load_export(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        payload = payload.get("titles", payload.get("results", payload.get("items", [])))
    if not isinstance(payload, list):
        raise ValueError("JSON export must be an array or contain a titles/results/items array.")
    return [row for row in payload if isinstance(row, dict)]


def normalize_row(row: dict[str, Any]) -> dict[str, Any] | None:
    title = str(first(row, "Title", "title", "Movie", "Name", "name") or "").strip()
    if not title:
        return None

    raw_year = first(row, "Year", "year", "Release Year", "ReleaseYear")
    match = re.search(r"(18[89]\d|19\d{2}|20\d{2}|21\d{2})", str(raw_year or ""))
    year = match.group(0) if match else ""

    raw_rating = first(row, "IMDb Rating", "IMDB Rating", "imdb_rating", "rating", "Rating")
    rating = None
    if raw_rating is not None:
        try:
            candidate = float(str(raw_rating).strip().replace(",", "."))
            if 0 <= candidate <= 10:
                rating = candidate
        except (TypeError, ValueError):
            pass

    imdb_id = str(first(row, "IMDb ID", "imdb_id", "imdbID", "imdbId") or "").strip()
    if not re.fullmatch(r"tt\d+", imdb_id, flags=re.IGNORECASE):
        imdb_id = ""

    genres = split_list(first(row, "Genre", "Genres", "genre", "genres"))
    directors = split_list(first(row, "Director", "Directors", "director", "directors"))
    countries = split_list(first(row, "Country", "Countries", "country", "countries"))
    overview = str(first(row, "Overview", "Plot", "Description", "Summary", "overview", "plot") or "").strip()
    source_url = str(first(row, "Wikipedia URL", "Wikipedia Link", "URL", "url", "source_url") or "").strip()

    item: dict[str, Any] = {
        "id": "wiki-" + slug(title) + ("-" + year if year else ""),
        "title": title,
        "overview": overview,
        "year": year,
        "rating": rating,
        "type": "movie",
        "genres": genres,
        "country": countries,
        "age_rating": None,
        "poster_url": None,
        "video_url": None,
        "source": "Wikipedia movie catalogue import",
        "published": True,
    }
    if directors:
        item["directors"] = directors
    if imdb_id:
        item["imdb_id"] = imdb_id
    if source_url.startswith("https://"):
        item["source_url"] = source_url
    return item


def merge(existing: list[dict[str, Any]], incoming: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int, int]:
    result = [dict(row) for row in existing if isinstance(row, dict)]
    by_imdb = {str(row.get("imdb_id", "")).lower(): i for i, row in enumerate(result) if row.get("imdb_id")}
    by_title_year = {(key(row.get("title")), str(row.get("year") or "")): i for i, row in enumerate(result)}
    added = updated = 0

    for candidate in incoming:
        imdb_id = str(candidate.get("imdb_id") or "").lower()
        identity = (key(candidate.get("title")), str(candidate.get("year") or ""))
        index = by_imdb.get(imdb_id) if imdb_id else None
        if index is None:
            index = by_title_year.get(identity)
        if index is None:
            # Do not silently collide generated IDs.
            base_id = candidate["id"]
            new_id = base_id
            suffix = 2
            existing_ids = {str(row.get("id")) for row in result}
            while new_id in existing_ids:
                new_id = f"{base_id}-{suffix}"
                suffix += 1
            candidate["id"] = new_id
            index = len(result)
            result.append(candidate)
            added += 1
        else:
            # Imported facts fill gaps only; manually curated fields take priority.
            current = result[index]
            for field in ("overview", "rating", "age_rating", "poster_url", "imdb_id", "source_url"):
                if not current.get(field) and candidate.get(field):
                    current[field] = candidate[field]
            for field in ("genres", "country", "directors"):
                current_values = current.get(field) or []
                if not isinstance(current_values, list):
                    current_values = split_list(current_values)
                current[field] = list(dict.fromkeys([*current_values, *(candidate.get(field) or [])]))
            if not current.get("year") and candidate.get("year"):
                current["year"] = candidate["year"]
            if not current.get("source"):
                current["source"] = candidate["source"]
            updated += 1
        saved = result[index]
        if saved.get("imdb_id"):
            by_imdb[str(saved["imdb_id"]).lower()] = index
        by_title_year[(key(saved.get("title")), str(saved.get("year") or ""))] = index

    return result, added, updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge a Wikipedia movie-scraper CSV/JSON export into Streamivio.")
    parser.add_argument("--input", required=True, type=Path, help="Scrapy CSV or JSON export")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG, help="Catalog JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Preview counts without changing the catalog")
    args = parser.parse_args()

    if not args.input.is_file():
        parser.error(f"Input export not found: {args.input}")
    if not args.catalog.is_file():
        parser.error(f"Catalog file not found: {args.catalog}")

    rows = load_export(args.input)
    incoming = [item for row in rows if (item := normalize_row(row))]
    if not incoming:
        print("No usable movie rows were found. Check the export's column names and contents.", file=sys.stderr)
        return 2

    payload = json.loads(args.catalog.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("titles"), list):
        raise ValueError("Catalog JSON must contain a top-level titles array.")
    merged, added, updated = merge(payload["titles"], incoming)

    print(f"Rows read: {len(rows)} | valid titles: {len(incoming)}")
    print(f"New titles: {added} | matched existing titles: {updated} | total catalog: {len(merged)}")
    if args.dry_run:
        print("Dry run only; no files changed.")
        return 0

    backup = args.catalog.with_suffix(args.catalog.suffix + ".bak")
    shutil.copy2(args.catalog, backup)
    payload["titles"] = merged
    payload["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    temp = args.catalog.with_suffix(args.catalog.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(args.catalog)
    print(f"Updated: {args.catalog}")
    print(f"Backup:  {backup}")
    print("Next: review the diff, run npm run build, then commit and push to deploy.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
