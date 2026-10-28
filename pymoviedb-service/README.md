# Streamivio Python API

Python metadata and catalog API for Streamivio. It supports movies, TV shows, anime, documentaries, kids' titles, and reality programming.

**Important:** this API currently provides discovery and metadata, not video files or unauthorized stream links. Real playback must be connected to a licensed video delivery provider.

## Deploy on Vercel

The repository's root `vercel.json` routes API paths to this service. The service entrypoint is `server:handler`. Vercel deploys from the repository root; no separate project is required.

Configure these environment variables in Vercel for the Python service (and local development):

- `SUPABASE_URL` — your Supabase project URL.
- `SUPABASE_ANON_KEY` — the public anon/publishable key. Never use a service-role or secret key here.

The catalog endpoints require a configured Supabase catalog. The existing IMDb metadata endpoints remain separate.

## Run locally

```powershell
cd pymoviedb-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"
python server.py
```

The local server listens at `http://127.0.0.1:8001` by default.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `GET /catalog` | Search/filter the Streamivio catalog |
| `GET /categories` | Media categories and published title counts |
| `GET /genres` | Genres found in the catalog |
| `GET /featured` | Highest-rated catalog titles |
| `GET /search?q=matrix&type=movie` | IMDb metadata search for movies or TV |
| `GET /popular?type=movie` | IMDb popular movies or TV |
| `GET /title?id=tt0133093` | IMDb title details |
| `GET /playback` | Explicit playback availability status; does not serve media |

### Catalog examples

- `/catalog?type=movie`
- `/catalog?type=tv&genre=drama`
- `/catalog?type=anime&sort=year`
- `/catalog?type=documentary&country=Kenya`
- `/catalog?q=space&limit=20&offset=0`
- `/catalog?year=2024&sort=rating`

Supported catalog types: `movie`, `tv`, `anime`, `documentary`, `kids`, `reality`.

Catalog filters are case-insensitive. `limit` accepts 1–100; `offset` supports pagination. Responses include normalized title fields and `playback_available: false` until a licensed playback provider is actually configured.

## Metadata source note

The `/search`, `/popular`, and `/title` endpoints use PyMovieDb to retrieve IMDb metadata. Respect upstream terms and rate limits. The Streamivio catalog endpoints read published rows from Supabase's `public.titles` table.
