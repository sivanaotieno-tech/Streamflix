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
