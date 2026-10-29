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

### Per-title details API

The Next.js app also exposes `GET /api/title` for the selected title. For example:

```text
/api/title?id=m-matrix&title=The%20Matrix&type=movie
```

The response returns a `title` object with a consistent shape for the detail dialog: synopsis, release year, genres, poster, rating, age rating, runtime, cast/directors when available, and any resolved IMDb/TMDB identifiers. It prefers the bundled catalog, enriches an exact title match with server-side IMDb metadata when the Python metadata service is configured, and safely falls back to the catalog when enrichment is unavailable. `metadata_available` makes that distinction explicit. Game records use the same detail API but remain discovery listings; they are not presented as playable video streams.

## Search

The website's `GET /api/search` endpoint supports `scope=all|movies|tv|anime|documentaries|kids|reality|games`, optional country/year/age-rating/genre filters, and sorting by best match, rating, newest year, or title. Search is case-, accent-, and punctuation-insensitive and ranks title matches above plot matches; the Python catalog also tolerates small spelling mistakes and searches overview text, genres, alternate titles, keywords, cast, and directors when those fields are present.

For the `all`, `movies`, and `tv` scopes, the website can supplement a short local result set with server-side IMDb title-search results when the Python service is configured through `PYMOVIEDB_SERVICE_URL` or `PYMOVIEDB_API_URL`. Results are merged to avoid duplicate titles, while games remain discovery entries with official-site links rather than video playback. If an external search source fails, the API reports it in `unavailable` and preserves results from sources that still respond.

Example: `/api/search?q=matrx&scope=all&sort=relevance` can find "The Matrix" despite a small typo; `/api/search?q=space&scope=movies&sort=year` orders matching movies by newest year.

## Email sign-in and account creation

Streamivio uses passwordless email verification. Visit `/sign-in`, choose **Create account** or **Sign in**, and request a six-digit code. The message uses the black-and-red Streamivio design from the email reference image. Codes are generated securely on the server, expire after 10 minutes, allow at most five verification attempts, and have a 60-second resend cooldown. Successful verification creates or signs in the account and sets an HTTP-only, same-site session cookie for up to 30 days.

API endpoints:

- `POST /api/auth/request-code` — rate-limited verification-email request.
- `POST /api/auth/verify-code` — validates the one-time code and creates a session.
- `GET /api/auth/me` — checks the current signed-in user.
- `POST /api/auth/signout` — revokes the current session.

### Required account and email configuration

Set the following as **server-side** environment variables in Vercel Project Settings → Environment Variables. Do not put secrets into client-side variables or commit them to GitHub.

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — persistent authentication, rate-limit, and payment records.
- `STREAMIVIO_AUTH_SECRET` — a random secret of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `RESEND_API_KEY` — transactional-email API key.
- `STREAMIVIO_EMAIL_FROM` — sender address on a domain verified in Resend, for example `Streamivio <no-reply@yourdomain.com>`.

The sign-in API returns a clear configuration error until these values exist and the sender domain is verified. The email is an automated transactional security message; the code itself is cryptographically generated, not produced by a language model.

## Subscription payments

The membership page at `/subscribe` requires a verified Streamivio account. It creates an IntaSend hosted checkout for the server-defined plan price and uses the account's verified email address (the browser cannot override it). The current plan prices are KSh 299/2,990 for Plus monthly/yearly and KSh 499/4,990 for Premium monthly/yearly. Payment options depend on what IntaSend has enabled for the account and currency.

Configure these server-side variables:

- `INTASEND_PUBLISHABLE_KEY` and `INTASEND_SECRET_KEY`.
- `INTASEND_WEBHOOK_CHALLENGE` — configure the same challenge in IntaSend's webhook settings.
- `NEXT_PUBLIC_APP_URL` — the public HTTPS origin of the deployed Streamivio site.

Configure IntaSend's collection-event webhook to point to `https://YOUR-DOMAIN/api/billing/webhook`. The server validates the challenge and verifies the invoice with IntaSend before activating a membership. A redirect alone never counts as proof of payment. The hosted-checkout reference is persisted even when IntaSend returns it as `id` rather than `invoice_id`, so the return page can query payment status.

Payment references: [IntaSend hosted checkout documentation](https://developers.intasend.com/guides/collections/checkout/) and [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

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

Streamivio's own direct-stream resolver only returns HTTPS `video_url` values you have configured for content you own or are licensed to distribute. A poster or metadata record does not grant streaming rights. The VidSrc iframe and its third-party availability/rights are controlled by that provider, not Streamivio; use it only where you are authorized to access and display the content. Streamivio does not extract protected player URLs or proxy third-party media bytes.

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
