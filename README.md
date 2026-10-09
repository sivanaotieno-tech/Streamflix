# Streamivio

Legitimate entertainment discovery and playback platform built with Next.js, React and Tailwind CSS.

The GitHub repository retains its historical name; the user-facing brand is **Streamivio**.

## APIs

- **PyMovieDb** — movie and TV metadata through the local Python service in `pymoviedb-service/`.
- **Kitsu** — anime metadata and discovery.
- **`/api/search`** — searches metadata catalogs; metadata is not a video stream.

## Rights policy

Streamivio is an entertainment discovery platform, not a third-party stream aggregator. The site must only play media that you own or have explicit rights to distribute. Movie, TV and anime metadata does not grant streaming rights.

Unverified third-party stream directories, external stream-resolver backends, public live-TV stream lists, remote PeerTube catalogs, personal media-server integrations, and all in-site video playback have been removed. Streamivio is metadata-only and does not resolve, embed, proxy, or play video streams. Metadata results are for discovery only.

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
2. Configure the PyMovieDb service URL in `.env.local`.
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

Movie, TV and anime search is metadata-only and does not supply video. Streamivio currently provides metadata and discovery only. No video playback, stream embedding, personal media server, or third-party streaming integration is included. Playback may be added only after the appropriate distribution rights and authorized content delivery are in place.
