"""Optional Python adapter for public StreameX page metadata.

This fetches basic page metadata only. It does not extract video URLs,
execute page scripts, or bypass access controls. Confirm permission to reuse
metadata and artwork before importing it into Streamivio.
"""
from html.parser import HTMLParser
from urllib.parse import urlparse
import json
import requests

BASE_URL = "https://www.streamex.hn/"
ALLOWED_HOSTS = {"streamex.hn", "www.streamex.hn"}
TIMEOUT = 8
MAX_BYTES = 1_000_000


class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.in_title = False
        self.title_parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() == "meta":
            key = attrs.get("property") or attrs.get("name")
            value = attrs.get("content")
            if key and value:
                self.meta[key.lower()] = value.strip()
        elif tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data.strip())


def fetch_page_metadata(url=BASE_URL):
    """Return basic title/description/poster metadata from a public HTTPS page."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Only HTTPS pages on streamex.hn are allowed")
    if parsed.username or parsed.password:
        raise ValueError("Credentials in URLs are not allowed")

    response = requests.get(
        url,
        headers={"User-Agent": "StreamivioMetadataClient/1.0"},
        timeout=TIMEOUT,
        allow_redirects=False,
        stream=True,
    )
    try:
        if response.is_redirect:
            raise RuntimeError("Source redirected; redirects are not followed")
        response.raise_for_status()
        body = bytearray()
        for chunk in response.iter_content(16384):
            body.extend(chunk)
            if len(body) > MAX_BYTES:
                raise RuntimeError("Source page exceeded the size limit")
        html = bytes(body).decode(response.encoding or "utf-8", errors="replace")
    finally:
        response.close()

    parser = MetadataParser()
    parser.feed(html)
    meta = parser.meta
    title = meta.get("og:title") or meta.get("twitter:title") or " ".join(parser.title_parts)
    description = (
        meta.get("og:description")
        or meta.get("description")
        or meta.get("twitter:description")
        or ""
    )
    poster = meta.get("og:image") or meta.get("twitter:image")
    if poster and not poster.startswith("https://"):
        poster = None

    return {
        "source": "StreameX",
        "source_url": url,
        "title": title[:250],
        "description": description[:2000],
        "poster_url": poster,
        "metadata_only": True,
        "stream_url": None,
        "note": "This adapter does not discover or extract video streams.",
    }


if __name__ == "__main__":
    print(json.dumps(fetch_page_metadata(), indent=2, ensure_ascii=False))
