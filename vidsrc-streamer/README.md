# Streamivio Authorized Stream Resolver

This FastAPI service is an optional, owner-controlled resolver for media URLs that Streamivio is authorized to distribute. The historical folder name is retained for repository compatibility; this service does **not** use VidSrc, scrape third-party players, extract protected streams, or proxy media bytes.

## Run locally (Windows PowerShell)

```powershell
cd vidsrc-streamer
py -m pip install -r requirements.txt
$env:STREAMIVIO_CATALOG_PATH = "C:\\path\\to\\your\\authorized-catalog.json"
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Set `STREAMIVIO_CATALOG_PATH` to a JSON file containing only media URLs Streamivio is authorized to distribute. The catalog may be an array or an object with a `titles` or `results` array. Each playable record needs an `imdb_id` and an HTTPS `video_url` ending in `.mp4` or `.m3u8`.

Example (illustrative URL only):

```json
[
  {
    "imdb_id": "tt0133093",
    "title": "Example licensed title",
    "video_url": "https://media.example.com/licensed-title/master.m3u8"
  }
]
```

## Endpoints

- `GET /health` — health status.
- `GET /stream/tt0133093` — returns the configured HTTPS media URL and its format.

Environment variables: `STREAMIVIO_CATALOG_PATH`, `STREAMIVIO_STREAM_CACHE`, `STREAMIVIO_CACHE_TTL`, and optional comma-separated `STREAMIVIO_CORS_ORIGINS`.

## Connect to Streamivio

The Next.js app calls `GET /api/playback?id=...`. It returns a source only when an authorized MP4/HLS URL is configured directly in the editorial catalogue or returned by this resolver. Set the server-only Vercel variable `STREAMIVIO_RESOLVER_URL` to the private resolver's HTTPS base URL, then redeploy.

The browser player supports MP4 and HLS. HLS playback uses native browser support where available and hls.js otherwise. A configured URL is not proof of successful playback: verify the media host, CORS policy, codecs, access controls and browser behavior.

Do not expose private resolver administration or cache-management endpoints publicly without authentication. Never place provider secrets in the catalog or client-side environment variables.
