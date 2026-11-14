#!/usr/bin/env python3
"""Refresh Streamivio's supplemental IMDb Top 250 discovery catalogue.

This is a build-time importer, not code that runs in a visitor's browser.
It reads the public chart pages once per chart and does not request every
individual title page. IMDb may rate-limit or change its HTML; on failure the
script exits without replacing the previous generated file.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "app" / "data" / "imdb-python-catalog.ts"
CHARTS = (
    ("https://www.imdb.com/chart/top/", "movie"),
    ("https://www.imdb.com/chart/toptv/", "tv"),
)
HEADERS = {
    "User-Agent": "StreamivioCatalogImporter/1.0 (metadata refresh; contact: repository maintainers)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.8",
}
TIMEOUT = 20


def safe_text(node: Any) -> str:
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip() if node else ""


def normalize_imdb_id(url: str) -> str | None:
    match = re.search(r"/title/(tt\d{5,12})", url)
    return match.group(1) if match else None


def parse_chart(html: str, kind: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows: dict[str, dict[str, Any]] = {}

    # Current IMDb chart markup.
    for card in soup.select("li.ipc-metadata-list-summary-item"):
        link = card.select_one('a[href*="/title/tt"]')
        if not link:
            continue
        imdb_id = normalize_imdb_id(str(link.get("href", "")))
        if not imdb_id:
            continue

        heading = card.select_one("h3.ipc-title__text")
        title = safe_text(heading)
        if not title:
            title = safe_text(link)
            title = re.sub(r"^\d+\.\s*", "", title)
        if not title:
            continue

        metadata = [safe_text(node) for node in card.select("span.cli-title-metadata-item")]
        year_match = re.search(r"\b(18|19|20|21)\d{2}\b", " ".join(metadata))
        rating_node = card.select_one("span.ipc-rating-star--rating")
        rating_text = safe_text(rating_node)
        try:
            rating = float(rating_text) if rating_text else 0.0
        except ValueError:
            rating = 0.0

        image = card.select_one("img")
        poster = image.get("src") if image else None
        if not isinstance(poster, str) or not poster.startswith("https://"):
            poster = None

        rows[imdb_id] = {
            "id": "imdb-" + imdb_id.lower(),
            "imdbId": imdb_id,
            "title": title,
            "overview": "",
            "year": year_match.group(0) if year_match else "",
            "rating": rating,
            "type": kind,
            "genres": [],
            "country": [],
            "source": "IMDb Top Charts",
            "poster": poster,
        }

    # Structured-data fallback for chart markup changes.
    if not rows:
        for script_tag in soup.select('script[type="application/ld+json"]'):
            raw = script_tag.string or script_tag.get_text()
            try:
                payload = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            candidates = payload if isinstance(payload, list) else [payload]
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue
                elements = candidate.get("itemListElement", [])
                if not isinstance(elements, list):
                    continue
                for element in elements:
                    item = element.get("item", {}) if isinstance(element, dict) else {}
                    if not isinstance(item, dict):
                        continue
                    imdb_id = normalize_imdb_id(str(item.get("url", "")))
                    title = str(item.get("name", "")).strip()
                    if imdb_id and title:
                        rows[imdb_id] = {
                            "id": "imdb-" + imdb_id.lower(),
                            "imdbId": imdb_id,
                            "title": title,
                            "overview": "",
                            "year": "",
                            "rating": 0.0,
                            "type": kind,
                            "genres": [],
                            "country": [],
                            "source": "IMDb Top Charts",
                            "poster": None,
                        }

    return list(rows.values())


def main() -> int:
    session = requests.Session()
    session.headers.update(HEADERS)
    combined: dict[str, dict[str, Any]] = {}

    for url, kind in CHARTS:
        response = session.get(url, timeout=TIMEOUT)
        if response.status_code in (403, 429):
            raise RuntimeError(
                f"IMDb returned HTTP {response.status_code} for {url}. "
                "The previous generated catalogue was left untouched."
            )
        response.raise_for_status()
        rows = parse_chart(response.text, kind)
        if len(rows) < 100:
            raise RuntimeError(
                f"Only {len(rows)} {kind} entries were parsed from {url}; "
                "refusing to overwrite the previous catalogue."
            )
        for row in rows:
            combined[row["imdbId"]] = row
        print(f"{kind}: parsed {len(rows)} chart entries")

    if len(combined) < 200:
        raise RuntimeError(
            f"Only {len(combined)} unique titles were parsed; refusing to overwrite output."
        )

    items = sorted(
        combined.values(),
        key=lambda item: (-float(item.get("rating") or 0), item["title"].casefold()),
    )
    source = (
        "import type { CatalogTitle } from './catalog';\n\n"
        "export const imdbPythonCatalog: CatalogTitle[] = "
        + json.dumps(items, ensure_ascii=False, indent=2)
        + ";\n"
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    temporary.write_text(source, encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Wrote {len(items)} unique IMDb chart titles to {OUTPUT}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (requests.RequestException, RuntimeError) as error:
        print(f"IMDb import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
