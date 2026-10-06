import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch

from server import MetadataHandler


class FakeIMDB:
    def search(self, title, tv=False):
        return json.dumps(
            {
                "result_count": 1,
                "results": [
                    {
                        "id": "tt1234567",
                        "name": f"{title} TV Series" if tv else title,
                        "url": "https://www.imdb.com/title/tt1234567/",
                        "poster": None,
                    }
                ],
            }
        )

    def popular_movies(self, genre=None):
        return json.dumps(
            {
                "result_count": 1,
                "results": [
                    {
                        "id": "tt7654321",
                        "name": f"{genre or 'Popular'} Movie",
                        "year": 2024,
                        "url": "https://www.imdb.com/title/tt7654321/",
                        "poster": "https://example.com/poster.jpg",
                    }
                ],
            }
        )

    def popular_tv(self, genre=None):
        return self.popular_movies(genre)

    def get_by_id(self, imdb_id):
        return json.dumps(
            {
                "type": "Movie",
                "name": "Test title",
                "url": f"https://www.imdb.com/title/{imdb_id}/",
            }
        )


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

    def test_search_returns_pymoviedb_results(self):
        with patch("server.create_imdb_client", return_value=FakeIMDB()):
            status, data = self.get_json("/search?q=Test%20title")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["id"], "tt1234567")

    def test_title_returns_pymoviedb_details(self):
        with patch("server.create_imdb_client", return_value=FakeIMDB()):
            status, data = self.get_json("/title?id=tt1234567")
        self.assertEqual(status, 200)
        self.assertEqual(data["name"], "Test title")

    def test_search_can_filter_tv_results(self):
        with patch("server.create_imdb_client", return_value=FakeIMDB()):
            status, data = self.get_json("/search?q=Test%20title&type=tv")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["name"], "Test title TV Series")

    def test_popular_movies_returns_pymoviedb_catalog(self):
        with patch("server.create_imdb_client", return_value=FakeIMDB()):
            status, data = self.get_json("/popular?type=movie&genre=action")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["name"], "action Movie")

    def test_popular_tv_returns_pymoviedb_catalog(self):
        with patch("server.create_imdb_client", return_value=FakeIMDB()):
            status, data = self.get_json("/popular?type=tv")
        self.assertEqual(status, 200)
        self.assertEqual(data["results"][0]["id"], "tt7654321")

    def test_upstream_search_failure_is_reported_as_gateway_error(self):
        with patch("server.create_imdb_client", side_effect=OSError("IMDb unavailable")):
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
