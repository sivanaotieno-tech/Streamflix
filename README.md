# Streamivio

Streamivio is a movie, TV, anime, documentary, kids/family and reality-entertainment discovery platform. The website is built with Next.js and the standalone catalog/playback API is Python.

## Catalog database (no Supabase)

The Python API uses `pymoviedb-service/data/catalog.json` as its bundled catalog database. The file stores each title's description, year, genres, country, age rating, poster URL and optional authorized playback URL.

To add or update titles, edit that JSON file and commit the change to GitHub. Vercel then redeploys the catalog. The API is read-only at runtime because Vercel serverless functions do not offer durable writable local filesystems.

### Title fields

- `id`, `title`, `overview`, `year`, `rating`, `type`
- `genres`, `country`, `age_rating`
- `poster_url`: public HTTPS poster artwork URL that you own or are licensed to use
- `video_url`: authorized HTTPS MP4 or HLS (.m3u8) media URL
- `published`: set false to hide a record from the public API

Posters are referenced by URL; this repository does not currently host poster image files. Full-length videos should be stored with a licensed video hosting/CDN provider. The API stores and returns your configured playback URL, rather than trying to store movie files inside Vercel.

## Python API

Public API routes are configured in `vercel.json` and routed to `pymoviedb-service/server.py`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `GET /catalog` | Search and filter the JSON catalog |
| `GET /categories` | Category counts |
| `GET /genres` | Genres in the catalog |
| `GET /featured` | Highest-rated titles |
| `GET /title?id=m-matrix` | Local title details |
| `GET /playback?id=m-matrix` | Returns configured playback URL when available |
| `GET /search?q=matrix&type=movie` | Optional IMDb metadata lookup |
| `GET /popular?type=movie` | Optional IMDb popular list |

Examples:
- `/catalog?type=movie`
- `/catalog?type=anime&genre=adventure`
- `/catalog?q=space&limit=20&offset=0`
- `/playback?id=m-matrix`

## Local Python development

```powershell
cd pymoviedb-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python server.py
```

The local API listens on `http://127.0.0.1:8001` by default. See [the Python API README](pymoviedb-service/README.md) for endpoint details.

## Playback and content rights

Streamivio must only play video that you own or have explicit permission to distribute. A poster or metadata record does not grant streaming rights. No unauthorized stream scraping, unlocking, proxying or third-party stream-directory aggregation is included. Playback stays unavailable until a valid authorized `video_url` is added.

## Playback integrations

### VidSrc embedded player

Streamivio can use the third-party VidSrc player when a catalog record has a known IMDb ID (imdb_id) or TMDB ID (tmdb_id). Movie embeds use https://vidsrc.sh/embed/movie/{id}; TV embeds use https://vidsrc.sh/embed/tv/{id}. A TV series can open with its built-in season/episode picker. See the [VidSrc website](https://vidsrc.sh/) and [official embed/API documentation](https://vidsrc.sh/vidsrc/docs/).

VidSrc is an external provider: availability, embed permission, advertising, and playback rights are not controlled by Streamivio. Only use content you are authorized to access and distribute.

### VidSrc-Streamer reference project

Reference: [habitual69/VidSrc-Streamer on GitHub](https://github.com/habitual69/VidSrc-Streamer). Streamivio includes a separate FastAPI + SQLite resolver in the vidsrc-streamer/ folder inspired by the service pattern. It intentionally does not copy third-party URL extraction or IPTV playlist scraping. It only resolves authorized HTTPS video_url values explicitly mapped in Streamivio's own catalog. See [the resolver setup guide](vidsrc-streamer/README.md).

## VidSrc player options and metadata

The playback dialog supports documented VidSrc embed options: subtitle-language preference, custom HTTPS subtitle tracks, autoplay request, TV season/episode selection, optional auto-next, manual start time, and saved-position resume based on validated player messages. TV seasons and provider quality/availability metadata are fetched through Streamivio's same-origin `/api/playback/info` route, which calls the documented `/info/movie/{id}.json` and `/info/tv/{id}.json` endpoints. Metadata responses are cached by the browser/CDN for approximately five minutes.

The frontend accepts progress messages only from the exact `https://vidsrc.sh` iframe origin and the current iframe window. Progress is kept in the viewer's browser local storage; it is not sent to Streamivio servers. The official/default VidSrc domain may still require a user click even when autoplay is requested.

References: [VidSrc home](https://vidsrc.sh/), [embed/API documentation](https://vidsrc.sh/vidsrc/docs/).

## Payments

The existing subscription UI and IntaSend/Upstash-based billing code are separate from the catalog database. Their credentials must remain in Vercel environment variables and must never be committed to the repository. Test payment flows with sandbox credentials before enabling live payments.

## Deployment

The root `vercel.json` routes API paths to the Python service and the remaining website paths to the Next.js app. Push commits to the configured production branch and verify the Vercel deployment and `/health` endpoint before relying on production behavior.
