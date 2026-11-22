import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
import main


class AuthorisedResolverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.catalog = Path(self.temp.name) / "catalog.json"
        self.patch = patch.object(main, "CATALOG_PATH", self.catalog)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()

    def write_catalog(self, row):
        self.catalog.write_text(json.dumps([row]), encoding="utf-8")

    def test_denies_title_without_rights_record(self):
        self.write_catalog({
            "imdb_id": "tt1234567",
            "video_url": "https://media.example.org/title/master.m3u8",
        })
        with self.assertRaises(HTTPException) as error:
            main.stream("tt1234567")
        self.assertEqual(error.exception.status_code, 403)

    def test_returns_only_rights_cleared_hls(self):
        self.write_catalog({
            "imdb_id": "tt1234567",
            "video_url": "https://media.example.org/title/master.m3u8",
            "distribution_authorized": True,
            "rights_status": "licensed",
            "rights_reference": "https://licences.example.org/record/123",
        })
        response = main.stream("tt1234567")
        self.assertTrue(response["distribution_authorized"])
        self.assertEqual(response["format"], "hls")

    def test_rejects_unsupported_format(self):
        self.write_catalog({
            "imdb_id": "tt1234567",
            "video_url": "https://media.example.org/title/stream",
            "distribution_authorized": True,
            "rights_status": "owned",
            "rights_reference": "https://rights.example.org/record/123",
        })
        with self.assertRaises(HTTPException) as error:
            main.stream("tt1234567")
        self.assertEqual(error.exception.status_code, 415)


if __name__ == "__main__":
    unittest.main()
