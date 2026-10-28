import json
import os
import re
import sys
from functools import partial
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from PyMovieDb import IMDB
from requests.exceptions import RequestException

from catalog import CatalogUnavailable, fetch_titles, get_catalog, get_categories, get_featured, get_genres, normalize
from streamex_source import fetch_page_metadata

IMDB_ID_PATTERN = re.compile(r"^tt\d+$")
IMDB_TYPES = {"movie", "tv"}
IMDB_GENRES = {
    "action", "adventure", "animation", "biography", "comedy", "crime",
    "drama", "family", "fantasy", "history", "horror", "music", "mystery",
    "romance", "sci_fi", "sport", "thriller", "war", "western",
}


def decode_result(result):
    if isinstance(result, str):
        result = json.loads(result)
    if not isinstance(result, dict):
        raise ValueError("PyMovieDb returned an unexpected response")
    return result


def create_imdb_client():
    client = IMDB(timeout=15)
    client.session.get = partial(client.session.get, timeout=15)
    return client


def describe_video_url(stream_url):
    """Classify a configured HTTPS playback URL; never fetch or proxy the media."""
    if not isinstance(stream_url, str) or not stream_url.strip():
        return None
    parsed = urlsplit(stream_url.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    path = parsed.path.lower()
    if path.endswith(".m3u8"):
        fmt = "hls"
    elif path.endswith(".mp4"):
        fmt = "mp4"
    else:
        fmt = "external"
    return {"stream_url": stream_url.strip(), "format": fmt, "delivery": "external-provider"}


class MetadataHandler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        request = urlsplit(self.path)
        query = parse_qs(request.query)
        path = request.path.rstrip("/") or "/"

        if path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok", "database": "local-json", "supabase": False})
            return
        try:
            if path == "/sources/streamex":
                try:
                    self.send_json(HTTPStatus.OK, fetch_page_metadata())
                except (RequestException, OSError, RuntimeError, ValueError) as error:
                    self.send_json(HTTPStatus.BAD_GATEWAY, {
                        "source": "StreameX",
                        "error": "Could not safely retrieve StreameX page metadata",
                        "detail": str(error),
                    })
                return

            if path == "/catalog":
                self.send_json(HTTPStatus.OK, get_catalog(query))
                return

            if path == "/categories":
                self.send_json(HTTPStatus.OK, get_categories())
                return

            if path == "/genres":
                self.send_json(HTTPStatus.OK, get_genres())
                return

            if path == "/featured":
                self.send_json(HTTPStatus.OK, get_featured())
                return

            if path == "/playback":
                title_id = query.get("id", [""])[0].strip()
                if not title_id:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A catalog title id is required"})
                    return
                title = next((row for row in fetch_titles() if row.get("id") == title_id), None)
                if title is None:
                    self.send_json(HTTPStatus.NOT_FOUND, {"available": False, "error": "Title not found"})
                    return
                item = normalize(title)
                playback = describe_video_url(title.get("video_url"))
                if not playback:
                    self.send_json(HTTPStatus.NOT_FOUND, {
                        "id": title_id,
                        "available": False,
                        "title": item["title"],
                        "message": "No valid HTTPS playback URL is configured. Add a video_url for a video you own or are licensed to distribute.",
                    })
                    return
                self.send_json(HTTPStatus.OK, {
                    "id": title_id,
                    "available": True,
                    "title": item["title"],
                    **playback,
                    "source": title.get("video_source") or "configured-authorized-source",
                })
                return

            if path == "/search":
                title = query.get("q", [""])[0].strip()
                title_type = query.get("type", ["movie"])[0].strip().lower()
                if len(title) < 2 or len(title) > 100:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Search query must be between 2 and 100 characters"})
                    return
                if title_type not in IMDB_TYPES:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Type must be movie or tv"})
                    return
                imdb = create_imdb_client()
                data = decode_result(imdb.search(title, tv=title_type == "tv"))
                results = data.get("results")
                if not isinstance(results, list):
                    raise ValueError("PyMovieDb returned no results list")
                self.send_json(HTTPStatus.OK, {"result_count": data.get("result_count", len(results)), "results": results[:20]})
                return

            if path == "/popular":
                title_type = query.get("type", ["movie"])[0].strip().lower()
                genre = query.get("genre", [""])[0].strip().lower()
                if title_type not in IMDB_TYPES:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Type must be movie or tv"})
                    return
                if genre and genre not in IMDB_GENRES:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Unsupported IMDb genre"})
                    return
                imdb = create_imdb_client()
                method = imdb.popular_movies if title_type == "movie" else imdb.popular_tv
                data = decode_result(method(genre=genre or None))
                results = data.get("results")
                if not isinstance(results, list):
                    raise ValueError("PyMovieDb returned no results list")
                self.send_json(HTTPStatus.OK, {"result_count": data.get("result_count", len(results)), "results": results[:50]})
                return

            if path == "/title":
                title_id = query.get("id", [""])[0].strip()
                local = next((row for row in fetch_titles() if row.get("id") == title_id), None)
                if local:
                    self.send_json(HTTPStatus.OK, normalize(local))
                    return
                if not IMDB_ID_PATTERN.fullmatch(title_id):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Use a catalog title id or a valid IMDb id (tt followed by digits)"})
                    return
                imdb = create_imdb_client()
                data = decode_result(imdb.get_by_id(title_id))
                status = HTTPStatus.NOT_FOUND if data.get("status") == HTTPStatus.NOT_FOUND else HTTPStatus.OK
                self.send_json(status, data)
                return
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        except CatalogUnavailable as error:
            self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                "error": "Streamivio catalog is unavailable",
                "detail": str(error)
            })
            return
        except (
            RequestException, OSError, TypeError, KeyError,
            AttributeError, IndexError, UnboundLocalError,
        ) as error:
            print(f"Streamivio API request failed: {error}", file=sys.stderr, flush=True)
            if path == "/search":
                self.send_json(HTTPStatus.BAD_GATEWAY, {"result_count": 0, "results": [], "error": "IMDb search is currently unavailable"})
                return
            if path == "/title":
                self.send_json(HTTPStatus.BAD_GATEWAY, {"name": None, "description": "The IMDb metadata service is currently unavailable", "error": "IMDb metadata is unavailable"})
                return
            self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "IMDb metadata lookup failed"})

    def log_message(self, format, *args):
        print(f"PyMovieDb service: {format % args}", file=sys.stderr, flush=True)


handler = MetadataHandler

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8001"))
    server = ThreadingHTTPServer((host, port), MetadataHandler)
    print(f"PyMovieDb metadata service listening at http://{host}:{port}", flush=True)
    server.serve_forever()
