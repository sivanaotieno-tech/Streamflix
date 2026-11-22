import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch

from server import MetadataHandler


class MetadataServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MetadataHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def get_json(self, path):
        with urlopen(self.base_url + path, timeout=3) as response:
            return response.status, json.load(response)

    def get_error_status(self, path):
        with self.assertRaises(HTTPError) as raised:
            urlopen(self.base_url + path, timeout=3)
        error = raised.exception
        error.close()
        return error.code

    def test_search_returns_normalized_imdb_suggestions(self):
        expected = {
            "result_count": 1,
            "results": [{
                "id": "tt1234567",
                "imdbID": "tt1234567",
                "imdb_id": "tt1234567",
                "name": "Test title",
                "title": "Test title",
                "url": "https://www.imdb.com/title/tt1234567/",
                "poster": None,
                "year": "2024",
                "type": "movie",
                "source": "IMDb",
            }],
        }
        with patch("server.fetch_imdb_suggestions", return_value=expected) as lookup:
            status, data = self.get_json("/search?q=Test%20title&type=movie")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["id"], "tt1234567")
        lookup.assert_called_once_with("Test title", "movie")

    def test_title_returns_lightweight_imdb_metadata(self):
        expected = {
            "result_count": 1,
            "results": [{
                "id": "tt1234567",
                "title": "Test title",
                "name": "Test title",
                "type": "movie",
                "poster": None,
                "year": "2024",
                "source": "IMDb",
            }],
        }
        with patch("server.fetch_imdb_suggestions", return_value=expected):
            status, data = self.get_json("/title?id=tt1234567")
        self.assertEqual(status, 200)
        self.assertEqual(data["name"], "Test title")
        self.assertIn("overview", data)

    def test_search_can_filter_tv_results(self):
        expected = {
            "result_count": 1,
            "results": [{
                "id": "tt7654321",
                "name": "Test title TV Series",
                "title": "Test title TV Series",
                "type": "tv",
            }],
        }
        with patch("server.fetch_imdb_suggestions", return_value=expected) as lookup:
            status, data = self.get_json("/search?q=Test%20title&type=tv")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["type"], "tv")
        lookup.assert_called_once_with("Test title", "tv")

    def test_popular_movies_returns_local_catalog(self):
        status, data = self.get_json("/popular?type=movie&genre=action")
        self.assertEqual(status, 200)
        self.assertGreater(data["result_count"], 0)
        self.assertTrue(all(item["type"] == "movie" for item in data["results"]))
        self.assertTrue(all("action" in [genre.lower() for genre in item["genres"]] for item in data["results"]))
        self.assertEqual(data["source"], "Streamivio Library")

    def test_popular_tv_returns_local_catalog(self):
        status, data = self.get_json("/popular?type=tv")
        self.assertEqual(status, 200)
        self.assertGreater(data["result_count"], 0)
        self.assertTrue(all(item["type"] == "tv" for item in data["results"]))

    def test_upstream_search_failure_is_reported_as_gateway_error(self):
        with patch("server.fetch_imdb_suggestions", side_effect=OSError("IMDb unavailable")):
            self.assertEqual(self.get_error_status("/search?q=Test"), 502)

    def test_short_query_is_rejected(self):
        self.assertEqual(self.get_error_status("/search?q=x"), 400)

    def test_unknown_search_type_is_rejected(self):
        self.assertEqual(self.get_error_status("/search?q=Test&type=person"), 400)

    def test_unknown_popular_genre_is_rejected(self):
        self.assertEqual(self.get_error_status("/popular?type=movie&genre=invalid"), 400)

    def test_invalid_imdb_id_is_rejected(self):
        self.assertEqual(self.get_error_status("/title?id=not-an-id"), 400)


if __name__ == "__main__":
    unittest.main()
