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



## Browser playback

The Streamivio title dialog includes a Play button. It first checks the local JSON catalog for a configured authorized MP4/HLS or external player URL. If none is configured, it attempts to resolve an exact IMDb ID through the metadata search endpoint and builds a VidSrc embed URL for the selected movie or the first episode (season 1, episode 1) of a TV title. The player is embedded in the browser; it does not download or proxy the video.

VidSrc is a third-party provider. Its availability, embed policy, rights status, and individual title playback are not controlled or guaranteed by Streamivio. Streamivio now uses the provider's documented `https://vidsrc.sh/embed/movie/{id}` and `https://vidsrc.sh/embed/tv/{id}` path formats. Use only content you are authorized to access and distribute. A deployment and end-to-end playback test are still required to verify your production configuration.
