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
            self.send_json(HTTPStatus.OK, {"status": "ok"})
            return
        try:
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
                imdb_id = query.get("id", [""])[0].strip()
                if not IMDB_ID_PATTERN.fullmatch(imdb_id):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "A valid IMDb title ID is required"})
                    return
                imdb = create_imdb_client()
                data = decode_result(imdb.get_by_id(imdb_id))
                status = HTTPStatus.NOT_FOUND if data.get("status") == HTTPStatus.NOT_FOUND else HTTPStatus.OK
                self.send_json(status, data)
                return
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})
        except (
            RequestException, OSError, ValueError, TypeError, KeyError,
            AttributeError, IndexError, UnboundLocalError,
        ) as error:
            print(f"PyMovieDb request failed: {error}", file=sys.stderr, flush=True)
            if path == "/search":
                self.send_json(HTTPStatus.BAD_GATEWAY, {"result_count": 0, "results": [], "error": "IMDb search is currently unavailable"})
                return
            if path == "/title":
                self.send_json(HTTPStatus.BAD_GATEWAY, {"name": None, "description": "The IMDb metadata service is currently unavailable", "error": "IMDb metadata is unavailable"})
                return
            self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "IMDb metadata lookup failed"})

    def log_message(self, format, *args):
        print(f"PyMovieDb service: {format % args}", file=sys.stderr, flush=True)


# Vercel's Python runtime discovers a BaseHTTPRequestHandler subclass named handler.
# Keep the local development server below for running this file directly.
handler = MetadataHandler

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8001"))
    server = ThreadingHTTPServer((host, port), MetadataHandler)
    print(f"PyMovieDb metadata service listening at http://{host}:{port}", flush=True)
    server.serve_forever()
