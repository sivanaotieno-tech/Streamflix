# Streamivio

Legitimate entertainment discovery and playback platform built with Next.js, React and Tailwind CSS.

The GitHub repository retains its historical name; the user-facing brand is **Streamivio**.

## APIs

Streamivio uses multiple sources:

- **PyMovieDb** — IMDb-backed popular movie and TV catalogs, search, and title details through the local Python service in `pymoviedb-service/`.
- **Kitsu** — anime metadata, popular anime, and search.
- **`/api/search`** — debounced, category-filterable search across PyMovieDb movies/TV and Kitsu anime. Results from healthy sources remain available when another source is offline.
- **iptv-org** — publicly listed live-TV channels and streams through `/api/live`.
- **Jellyfin** — optional self-hosted movie/TV library shown on the Jellyfin page and played in Streamivio through a server-side, range-aware proxy.
- **PeerTube** — optional self-hosted video catalog and playback.
- **OMSS** — optional streaming-source API integration. Set `OMSS_API_URL` to an OMSS-compatible backend; Streamivio requests standardized movie sources from `/v1/movies/:id`.

## Rights policy

Streamivio must only make video available when the operator has the necessary authorization, owns the content, or the content is legitimately available for the intended use. Metadata/discovery sources do not grant streaming rights. Do not configure Streamivio to resolve, proxy, embed, or distribute unauthorized copyrighted streams.

Movie and TV discovery uses PyMovieDb for metadata; it does not provide video streams. Connect Jellyfin or PeerTube for in-site playback of media you are authorized to access. Anime discovery also provides metadata, not video. Streamivio does not use the Internet Archive as a catalog or streaming source. The Movies page includes IMDb genre filters; title details include available release, rating, genre, runtime, director, and cast metadata.


## Subscriptions and payments

The subscription UI is at `/subscribe`. It offers Streamivio Plus (KSh 299/month or KSh 2,990/year) and Streamivio Premium (KSh 499/month or KSh 4,990/year). These are configurable starter prices, not a statement that licensed premium titles are already available.

Payments use IntaSend hosted checkout. For KES, IntaSend can display M-Pesa and card methods enabled on your merchant account. A customer selects a plan and period, then leaves Streamivio for the hosted checkout page. Streamivio does **not** activate a membership based on the browser redirect: the status route checks the invoice with IntaSend and verifies the invoice ID, amount, currency and unique order reference. The webhook also validates the configured challenge and independently checks the payment with IntaSend. Subscription records are stored in Upstash Redis, not process memory.

### Configure locally and on Vercel

1. Create an IntaSend account at [IntaSend Developers](https://developers.intasend.com/) and use sandbox API keys first. In **Settings → API Keys**, copy the publishable key and secret key. Keep the secret key server-side.
2. Create an Upstash Redis database and copy its **REST URL** and **REST token**.
3. Copy `.env.example` to `.env.local` locally, then set:
   - `INTASEND_PUBLISHABLE_KEY`
   - `INTASEND_SECRET_KEY`
   - `INTASEND_WEBHOOK_CHALLENGE` (use a long random secret; it must match the dashboard challenge)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_APP_URL` (the canonical public HTTPS URL, without a trailing slash)
4. Add the same values in **Vercel → Project → Settings → Environment Variables** for Preview and Production as appropriate, then redeploy.
5. In IntaSend, open **Settings → Webhooks → New**. Set the endpoint to `https://YOUR-DOMAIN/api/billing/webhook`, use the exact same challenge as `INTASEND_WEBHOOK_CHALLENGE`, and subscribe to `collection_event`. Test failed, pending and completed transactions using sandbox keys before going live.
6. When tests pass, switch to live IntaSend keys, verify your merchant account and checkout methods, and redeploy.

### Important billing limitations

- Checkout charges one selected billing period at a time. Renewal is **manual**; this implementation does not silently auto-charge a saved card. IntaSend's separate recurring-subscription API is for recurring card billing, and should be integrated only after its customer/plan setup and subscription webhooks are explicitly configured. Do not assume M-Pesa supports automatic recurring charges.
- The site currently has no full account/login system. After a verified checkout, a secure HTTP-only membership cookie identifies that browser. For a public commercial launch, add proper user accounts, account recovery, membership management/cancellation, refund and privacy flows, rate limiting, monitoring, and support processes before relying on this cookie-only model for a full customer account.
- The catalog's metadata rows are not marked as premium content, so this integration does not gate existing catalog browsing or claim any titles are licensed. Gate only playback for content explicitly tagged as authorized premium content once that catalog entitlement model exists.
- Do not commit `.env.local` or put secret values in client-side code. Never enable live payments until you have permission to sell the service and the relevant content rights.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Configure the PyMovieDb service URL and optionally set `JELLYFIN_URL` and `JELLYFIN_API_KEY` in `.env.local` for your Jellyfin library.
3. Start the PyMovieDb service in a separate terminal:

   ```powershell
   cd pymoviedb-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python server.py
   ```

   The default `PYMOVIEDB_API_URL` is `http://127.0.0.1:8001`. See [pymoviedb-service/README.md](./pymoviedb-service/README.md) for details.
4. Run `npm install` and `npm run dev` from the website directory.

PyMovieDb scrapes IMDb for metadata. Use it in accordance with IMDb's terms and applicable laws.

## Playback model

Metadata search does not stream movies or TV. For in-site playback, connect an authorized self-hosted Jellyfin or PeerTube library. Jellyfin video bytes are relayed through the Next.js server, including byte ranges for seeking; ensure that server can reach Jellyfin and can handle the bandwidth. Read [docs/JELLYFIN.md](./docs/JELLYFIN.md) for setup and access-control notes.
