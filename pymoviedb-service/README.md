# Streamivio Python Catalog and Playback API

A standalone Python API backed by the repository's own JSON catalogue at `data/catalog.json`. It has no Supabase or other database service dependency. External IMDb lookups are disabled pending a commercial metadata licence.

## Catalog database

Edit `data/catalog.json` and commit the changes to update the catalog. Each title supports:

- `id`, `title`, `overview` (description), `year`, `rating`, `type`
- `genres`, `country`, `age_rating`
- `poster_url`: public HTTPS image URL for artwork you own or are licensed to use
- `video_url`: HTTPS MP4 or HLS (.m3u8) URL for video you own or are licensed to distribute
- `published`: set to false to hide a title from the API

The API is read-only at runtime. Vercel functions do not provide durable writable local storage, so changes to the bundled JSON database must be committed to the repository and redeployed. Large video files should live on a licensed video hosting/CDN service; this API stores the authorized playback URL, not the video bytes.

For the website's detail dialog, the Next.js route `GET /api/title?id=...&title=...&type=movie|tv` returns local catalogue records only. External metadata enrichment is disabled.

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
| `GET /search?q=matrix&type=movie` | Disabled until commercial metadata rights are secured |
| `GET /popular?type=movie` | Local editorial catalogue shelf |

Catalog examples: `/catalog?type=movie`, `/catalog?type=anime&genre=adventure`, `/catalog?q=space&limit=20&offset=0`.

### Search behavior

`/catalog?q=...` ranks exact and partial title matches ahead of matches found in plot descriptions. The local search index is tolerant of case, accents, punctuation, and small spelling mistakes. When present in the JSON records, it also searches original and alternate titles, genres, keywords, cast, directors, countries, and descriptions. You can use `sort=relevance` (the default for a non-empty query), `sort=rating`, `sort=year`, or `sort=title`. Country filters accept common aliases such as `US`/`USA`/`United States` and `UK`/`United Kingdom`.

The website uses the bundled Streamivio editorial catalogue for search and discovery. IMDb suggestion lookup has been disabled until an appropriate commercial metadata licence is secured.

A title's playback endpoint returns unavailable until `video_url` is set to a working, authorized media URL. The API does not scrape, unlock, proxy, or supply unauthorized movie streams.



## Browser playback

The Streamivio title dialog includes a Play button. It first calls the Next.js `/api/playback` route for a configured authorized HTTPS MP4/HLS URL or an optional private resolver URL (`STREAMIVIO_RESOLVER_URL`). The catalog API only reports playback when an authorized media URL is configured; metadata lookup does not manufacture a stream. The player does not download or proxy third-party video.


## Optional authorized playback resolver

A separate FastAPI resolver lives in `../authorized-media-resolver/`. It exposes `GET /stream/{imdb_id}` and only returns an authorized HTTPS MP4/HLS URL explicitly mapped to that IMDb ID in the configured JSON catalog. Every entry must include `distribution_authorized=true`, a valid `rights_status`, and a `rights_reference`. It does not extract third-party streams. Install and run it using the instructions in `../authorized-media-resolver/README.md`.

For the Next.js app to call it, set the server-only Vercel environment variable `STREAMIVIO_RESOLVER_URL` to the private resolver's HTTPS base URL. Set `PYMOVIEDB_SERVICE_URL` to the Python catalogue API's HTTPS base URL only if you need the local catalogue API. Redeploy after changing environment variables. The resolver has no cache-clear endpoint. Hovod playback is integrated through the main Streamivio API; its public/unlisted playback IDs are only for content cleared for public playback, not subscriber-only titles.


## Playback metadata API

The Next.js app also exposes `GET /api/playback/info?id={imdb-id}&type=movie|tv`, with optional paired `season` and `episode` parameters for TV episodes. It validates input and returns metadata only. It does not extract media bytes or direct provider stream URLs.
