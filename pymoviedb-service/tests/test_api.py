"""Offline smoke tests for Streamivio's JSON catalog API."""
import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch

SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

import catalog  # noqa: E402
import server as api_server  # noqa: E402


class CatalogTests(unittest.TestCase):
    def test_movie_catalog_returns_expected_records(self):
        result = catalog.get_catalog({
            "type": ["movie"],
            "q": ["matrix"],
            "limit": ["20"],
            "offset": ["0"],
        })
        self.assertGreaterEqual(result["total"], 1)
        self.assertTrue(any(item["title"] == "The Matrix" for item in result["results"]))
        self.assertTrue(all(item["type"] == "movie" for item in result["results"]))

    def test_sci_fi_filter_accepts_underscore_and_hyphen(self):
        result = catalog.get_catalog({
            "type": ["movie"],
            "genre": ["sci_fi"],
            "limit": ["100"],
            "offset": ["0"],
        })
        titles = {item["title"] for item in result["results"]}
        self.assertIn("The Matrix", titles)
        self.assertIn("Inception", titles)
        self.assertIn("Interstellar", titles)

    def test_typo_tolerant_search_finds_misspelled_title(self):
        result = catalog.get_catalog({
            "q": ["matrx"],
            "limit": ["20"],
            "offset": ["0"],
        })
        self.assertGreaterEqual(result["total"], 1)
        self.assertEqual(result["results"][0]["title"], "The Matrix")

    def test_title_match_ranks_above_plot_keyword_match(self):
        rows = [
            {"id": "plot-hit", "title": "Ordinary Drama", "overview": "A space journey.", "year": "2020", "rating": 7, "type": "movie"},
            {"id": "title-hit", "title": "Space Jam", "overview": "A basketball comedy.", "year": "1996", "rating": 6, "type": "movie"},
        ]
        with patch("catalog.fetch_titles", return_value=rows):
            result = catalog.get_catalog({"q": ["space"], "limit": ["20"], "offset": ["0"]})
        self.assertEqual(result["results"][0]["id"], "title-hit")

    def test_search_can_match_alternate_titles_and_cast(self):
        rows = [
            {
                "id": "alias-test", "title": "Example Feature", "overview": "An example story.",
                "alternate_titles": ["The Silver Comet"], "cast": ["Keanu Reeves"],
                "year": "2020", "rating": 7, "type": "movie",
            }
        ]
        with patch("catalog.fetch_titles", return_value=rows):
            alias_result = catalog.get_catalog({"q": ["Silver Comet"], "limit": ["20"], "offset": ["0"]})
            cast_result = catalog.get_catalog({"q": ["Keanu Reeves"], "limit": ["20"], "offset": ["0"]})
        self.assertEqual(alias_result["results"][0]["id"], "alias-test")
        self.assertEqual(cast_result["results"][0]["id"], "alias-test")

    def test_country_filter_accepts_common_us_aliases(self):
        result = catalog.get_catalog({
            "country": ["US"],
            "limit": ["100"],
            "offset": ["0"],
        })
        titles = {item["title"] for item in result["results"]}
        self.assertIn("The Matrix", titles)

    def test_pagination_is_consistent(self):
        all_rows = catalog.get_catalog({"type": ["movie"], "limit": ["100"], "offset": ["0"]})
        page = catalog.get_catalog({"type": ["movie"], "limit": ["3"], "offset": ["2"]})
        self.assertEqual(page["total"], all_rows["total"])
        self.assertEqual(page["results"], all_rows["results"][2:5])

    def test_invalid_query_is_rejected(self):
        with self.assertRaises(ValueError):
            catalog.get_catalog({"q": ["x"], "limit": ["20"], "offset": ["0"]})

    def test_configured_direct_streams_require_https(self):
        self.assertEqual(
            api_server.describe_video_url("https://media.example.org/demo.mp4")["format"],
            "mp4",
        )
        self.assertEqual(
            api_server.describe_video_url("https://media.example.org/list.m3u8")["format"],
            "hls",
        )
        self.assertIsNone(api_server.describe_video_url("http://media.example.org/demo.mp4"))
        self.assertIsNone(api_server.describe_video_url("https://user:pass@media.example.org/demo.mp4"))


class HttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), api_server.MetadataHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = "http://127.0.0.1:%s" % cls.httpd.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=2)

    def request_json(self, path):
        try:
            with urlopen(self.base_url + path, timeout=3) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def test_health_route(self):
        status, payload = self.request_json("/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["database"], "local-json")
        self.assertFalse(payload["supabase"])

    def test_catalog_route_ranks_title_matches(self):
        status, payload = self.request_json("/catalog?q=matrix&type=movie")
        self.assertEqual(status, 200)
        self.assertEqual(payload["results"][0]["title"], "The Matrix")

    def test_catalog_http_route_recovers_from_a_small_typo(self):
        status, payload = self.request_json("/catalog?q=matrx&type=movie")
        self.assertEqual(status, 200)
        self.assertGreaterEqual(payload["total"], 1)
        self.assertEqual(payload["results"][0]["title"], "The Matrix")

    def test_title_route_returns_details_for_every_published_catalog_item(self):
        for row in catalog.fetch_titles():
            with self.subTest(title_id=row["id"]):
                status, payload = self.request_json("/title?id=" + row["id"])
                self.assertEqual(status, 200)
                self.assertEqual(payload["id"], row["id"])
                self.assertEqual(payload["title"], row["title"])
                self.assertIsInstance(payload["overview"], str)

    def test_title_route_rejects_invalid_external_id(self):
        status, payload = self.request_json("/title?id=not-an-imdb-id")
        self.assertEqual(status, 400)
        self.assertIn("valid IMDb id", payload["error"])

    def test_playback_is_honest_when_no_stream_is_configured(self):
        status, payload = self.request_json("/playback?id=m-matrix")
        self.assertEqual(status, 404)
        self.assertFalse(payload["available"])
        self.assertIn("video_url", payload["message"])


if __name__ == "__main__":
    unittest.main()
