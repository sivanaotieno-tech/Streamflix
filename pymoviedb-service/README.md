# Streamivio Python Catalog and Playback API

A standalone Python API backed by the repository's own JSON catalog at `data/catalog.json`. It has no Supabase or other database service dependency.

## Catalog database

Edit `data/catalog.json` and commit the changes to update the catalog. Each title supports:

- `id`, `title`, `overview` (description), `year`, `rating`, `type`
- `genres`, `country`, `age_rating`
- `poster_url`: public HTTPS image URL for artwork you own or are licensed to use
- `video_url`: HTTPS MP4 or HLS (.m3u8) URL for video you own or are licensed to distribute
- `published`: set to false to hide a title from the API

The API is read-only at runtime. Vercel functions do not provide durable writable local storage, so changes to the bundled JSON database must be committed to the repository and redeployed. Large video files should live on a licensed video hosting/CDN service; this API stores the authorized playback URL, not the video bytes.

For the website's enriched detail dialog, the Next.js route `GET /api/title?id=...&title=...&type=movie|tv` wraps this catalog and optionally enriches an exact title match with IMDb metadata. It returns the catalog details when the metadata service is unreachable, so a temporary third-party outage does not make local titles disappear.

## Run locally

```powershell
cd pymoviedb-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python server.py
```

Default address: `http://127.0.0.1:8001`.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API health |
| `GET /catalog` | Search/filter titles |
| `GET /categories` | Categories and counts |
| `GET /genres` | Available genres |
| `GET /featured` | Highest-rated titles |
| `GET /title?id=m-matrix` | Full local title metadata |
| `GET /playback?id=m-matrix` | Returns configured authorized playback URL |
| `GET /search?q=matrix&type=movie` | Optional IMDb metadata search |
| `GET /popular?type=movie` | Optional IMDb popular list |

Catalog examples: `/catalog?type=movie`, `/catalog?type=anime&genre=adventure`, `/catalog?q=space&limit=20&offset=0`.

A title's playback endpoint returns unavailable until `video_url` is set to a working, authorized media URL. The API does not scrape, unlock, proxy, or supply unauthorized movie streams.



## Browser playback

The Streamivio title dialog includes a Play button. It first calls the Next.js `/api/playback` route for a configured authorized HTTPS MP4/HLS URL or an optional private resolver URL (`STREAMIVIO_RESOLVER_URL`). If no direct stream is configured, the route can use the server-side Python metadata API (`PYMOVIEDB_SERVICE_URL` or `PYMOVIEDB_API_URL`) to resolve an exact IMDb ID and return a VidSrc embed URL. The player is embedded in the browser; it does not download or proxy third-party video.

VidSrc is a third-party provider. See the [VidSrc website](https://vidsrc.sh/) and [official embed/API documentation](https://vidsrc.sh/vidsrc/docs/). Its availability, embed policy, rights status, and individual title playback are not controlled or guaranteed by Streamivio. Streamivio now uses the provider's documented `https://vidsrc.sh/embed/movie/{id}` and `https://vidsrc.sh/embed/tv/{id}` path formats. Use only content you are authorized to access and distribute. A deployment and end-to-end playback test are still required to verify your production configuration.


## Optional VidSrc-Streamer-style resolver

A separate FastAPI + SQLite resolver now lives in `../vidsrc-streamer/`. It exposes `GET /stream/{imdb_id}` and only returns an authorized HTTPS `video_url` explicitly mapped to that IMDb ID in the configured JSON catalog. It does not extract third-party streams. Install and run it using the instructions in `../vidsrc-streamer/README.md`.

For the Next.js app to call it, set the server-only Vercel environment variable `STREAMIVIO_RESOLVER_URL` to the private resolver's HTTPS base URL. Set `PYMOVIEDB_SERVICE_URL` to the Python catalog API's HTTPS base URL if you want server-side IMDb metadata lookup for VidSrc embeds. Redeploy after changing environment variables. Do not deploy the resolver's cache-clear endpoint publicly without authentication.


## VidSrc metadata API proxy

The Next.js app also exposes `GET /api/playback/info?id={imdb-or-tmdb-id}&type=movie|tv`, with optional paired `season` and `episode` parameters for TV episodes. It validates input and calls the official VidSrc metadata endpoints for availability, title, year, seasons and reported quality. No media bytes or direct provider stream URLs are extracted by this route.
