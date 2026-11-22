# Streamivio Authorised Media Resolver

This optional FastAPI service resolves only MP4/HLS URLs explicitly configured in a Streamivio catalogue with a verified distribution-rights record. The historical `vidsrc-streamer` directory name is retained for compatibility; this service does **not** use VidSrc.

## Run locally (Windows PowerShell)

```powershell
cd vidsrc-streamer
py -m pip install -r requirements.txt
$env:STREAMIVIO_CATALOG_PATH = "C:\\path\\to\\your\\authorised-catalog.json"
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Every playable catalogue record must include:
- `imdb_id`
- `video_url` ending in `.mp4` or `.m3u8`
- `distribution_authorized: true`
- `rights_status: licensed | owned | public_domain`
- `rights_reference` pointing to the relevant contract, licence, ownership record or public-domain evidence.

Example (illustrative only):

```json
[
  {
    "imdb_id": "tt0000000",
    "title": "Example authorised title",
    "video_url": "https://media.example.com/title/master.m3u8",
    "distribution_authorized": true,
    "rights_status": "public_domain",
    "rights_reference": "https://example.org/rights-record"
  }
]
```

## Endpoints

- `GET /health`
- `GET /stream/tt0000000`

The resolver does not scrape, extract, decrypt, proxy, or bypass access controls. It returns a configured HTTPS URL only after the rights gate passes. A successful lookup does not replace a real browser playback test.

Configure the server-only Vercel variable `STREAMIVIO_RESOLVER_URL` with its HTTPS base URL. Never place provider credentials or signed URLs in client-side variables.
