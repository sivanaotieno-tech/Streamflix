# Streamivio Authorised Media Resolver

This optional FastAPI service resolves only MP4/HLS URLs explicitly configured in a Streamivio catalogue with a verified distribution-rights record. This service is independent of third-party streaming embed sites.

## Run locally (Windows PowerShell)

```powershell
cd authorized-media-resolver
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


## Docker deployment

Build from the repository root:

```powershell
docker build -t streamivio-authorized-resolver ./authorized-media-resolver
docker run -d --name streamivio-authorized-resolver -p 8000:8000 -v "${PWD}/pymoviedb-service/data:/data:ro" streamivio-authorized-resolver
```

The container expects the mounted file at `/data/catalog.json`. Keep the catalogue read-only in the container. Expose it only behind HTTPS and set the Vercel server-side `STREAMIVIO_RESOLVER_URL` to its public HTTPS origin.
