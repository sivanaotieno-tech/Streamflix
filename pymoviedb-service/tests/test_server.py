import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import urlopen

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

    def test_external_search_is_disabled_without_commercial_licence(self):
        self.assertEqual(self.get_error_status("/search?q=Test%20title&type=movie"), 410)

    def test_external_title_lookup_is_not_available(self):
        self.assertEqual(self.get_error_status("/title?id=tt1234567"), 404)

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

    def test_short_search_query_is_disabled_with_gone_status(self):
        self.assertEqual(self.get_error_status("/search?q=x"), 410)

    def test_unknown_search_type_is_disabled_with_gone_status(self):
        self.assertEqual(self.get_error_status("/search?q=Test&type=person"), 410)

    def test_unknown_popular_genre_is_rejected(self):
        self.assertEqual(self.get_error_status("/popular?type=movie&genre=invalid"), 400)

    def test_unknown_title_is_not_found(self):
        self.assertEqual(self.get_error_status("/title?id=not-an-id"), 404)


if __name__ == "__main__":
    unittest.main()
