# Streamivio Authorized Stream Resolver

A small FastAPI service inspired by the layout of VidSrc-Streamer, designed to work alongside Streamivio's VidSrc embedded player. It provides a SQLite cache and `GET /stream/{imdb_id}`, but resolves only HTTPS URLs explicitly configured in your own catalog for content you own or are licensed to distribute. It does not scrape VidSrc, extract protected third-party player URLs, or proxy media bytes.

## Run locally (Windows PowerShell)

```powershell
cd vidsrc-streamer
py -m pip install -r requirements.txt
$env:STREAMIVIO_CATALOG_PATH = "$HOME\Desktop\PythonThingy\Streamivio\data\catalog.json"
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Set `STREAMIVIO_CATALOG_PATH` to the actual path of your catalog JSON. The catalog may be a JSON array, or an object with a `titles` or `results` array. Each playable record should include `imdb_id`, `video_url`, and optionally `title`. Example:

```json
[
  {
    "imdb_id": "tt0133093",
    "title": "Example title you are authorized to distribute",
    "video_url": "https://media.example.com/licensed-title/master.m3u8"
  }
]
```

The example URL is illustrative; replace it with a real HTTPS MP4/HLS URL you are authorized to use. Never put provider secrets or private credentials in the catalog.

## Endpoints

- `GET /health` — health status.
- `GET /stream/tt0133093` — returns a configured authorized URL and its format; cache entries expire after 300 seconds by default.

Environment variables: `STREAMIVIO_CATALOG_PATH`, `STREAMIVIO_STREAM_CACHE`, `STREAMIVIO_CACHE_TTL`, and optional comma-separated `STREAMIVIO_CORS_ORIGINS`.

## Upstream references

- [VidSrc-Streamer reference project](https://github.com/habitual69/VidSrc-Streamer)
- [VidSrc website](https://vidsrc.sh/)
- [VidSrc embed/API documentation](https://vidsrc.sh/vidsrc/docs/)

Streamivio uses the official documented embed URL formats for the browser player. The local resolver is intentionally limited to authorized HTTPS URLs configured in the Streamivio catalog; it does not implement third-party stream extraction or the upstream project's IPTV playlist generator.

## Streamivio frontend

The Next.js app has `GET /api/playback?id=...` for configured direct streams and supports VidSrc embeds with IMDb or numeric TMDB IDs. The player settings include documented subtitle preferences, custom HTTPS subtitle files, start time, TV episode selection, auto-next, and browser-local watch-position resume. The same-origin `GET /api/playback/info` endpoint reports provider availability and quality metadata. To resolve authorized streams through this service, deploy it privately or behind authentication, then set the server-only `STREAMIVIO_RESOLVER_URL=https://your-service.example` environment variable. The Next.js playback route is already wired to call this endpoint. Do not expose a private resolver or admin endpoint publicly without authentication.

VidSrc embed URLs are third-party and are not guaranteed to be available, licensed, or embeddable. Use the player only for content you are authorized to access.


## VidSrc embed features used by the frontend

The Streamivio player can pass documented embed parameters for subtitle language (`ds_lang`), HTTPS custom subtitles (`sub_url`, `sub_label`, `sub_lang`), autoplay, TV auto-next, and resume (`startAt`). When a TV season and episode are chosen, it uses `/embed/tv/{id}/{season}/{episode}`; otherwise it opens the series picker. The separate `/api/playback/info` route reads VidSrc availability and quality metadata. These features apply only to the browser embed; the authorized direct-stream resolver remains limited to HTTPS media URLs explicitly configured in the catalog.
