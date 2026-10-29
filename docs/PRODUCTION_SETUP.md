# Streamivio production setup: sign-in email and payments

Streamivio already contains the email-code sign-in UI, Resend email delivery, Upstash-backed sessions, IntaSend hosted checkout, a payment-status verifier, and an IntaSend webhook. The code cannot send real email or charge real payment methods until the owner configures valid provider credentials. Never commit real secrets to GitHub.

## 1. Add the environment variables in Vercel

Open the `streamivio` project in Vercel → Settings → Environment Variables. Add the following to the environments you intend to use. Keep API keys and tokens as **Secret** values. Production values and sandbox/preview values should be separate.

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL; used for accounts, one-time codes, sessions and subscriptions |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `STREAMIVIO_AUTH_SECRET` | Random secret of at least 32 characters, used to HMAC verification codes |
| `RESEND_API_KEY` | Resend transactional email API key |
| `STREAMIVIO_EMAIL_FROM` | Sender such as `Streamivio <security@your-verified-domain.example>`; the domain must be verified in Resend |
| `INTASEND_PUBLISHABLE_KEY` | IntaSend publishable key; use a test key in sandbox first |
| `INTASEND_SECRET_KEY` | IntaSend secret key; server-side only |
| `INTASEND_WEBHOOK_CHALLENGE` | Long random shared secret configured identically in Vercel and the IntaSend webhook dashboard |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS origin of the deployed website, with no trailing slash |
| `APP_URL` | Optional server-only fallback for the same public HTTPS origin |

Generate an authentication secret locally, without putting a real secret in a command saved to GitHub:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Generate a separate random challenge for IntaSend. Do not reuse the authentication secret for the webhook challenge.

Use the public production domain, not a preview URL, for payment redirects. I changed the project's Vercel SSO-protection scope to `preview`, keeping previews protected while allowing production aliases to be public. Verify the production alias is reachable without an interactive Vercel login, and confirm no deployment-level password/SSO or trusted-IP rule blocks IntaSend's webhook. If access is still protected, use a verified public custom domain or correct the remaining deployment-protection override before enabling payments.

## 2. Configure the email sender

1. Create a Resend API key with sending permission.
2. Add and verify your sending domain in Resend. Publish the DNS records Resend requests.
3. Set `RESEND_API_KEY` and `STREAMIVIO_EMAIL_FROM` in Vercel.
4. Redeploy when deployments are available, then request a code from `/sign-in`.

The app creates six-digit codes using Node.js's cryptographically secure random-number generator, stores only an HMAC hash in Redis, expires codes after 10 minutes, and limits attempts and resend frequency. Resend delivers the email; no machine-learning model generates or chooses the authentication code. This is intentional: a security code must be unpredictable.

The HTML email uses Streamivio's black-and-red design, six bordered digit boxes, an expiry notice, and a reminder not to share the code.

## 3. Configure IntaSend hosted checkout

1. Start with IntaSend sandbox publishable and secret keys.
2. Set `INTASEND_PUBLISHABLE_KEY`, `INTASEND_SECRET_KEY`, `INTASEND_WEBHOOK_CHALLENGE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and the public app URL in Vercel.
3. In IntaSend → Settings → Webhooks, add the HTTPS endpoint:

   `https://YOUR_PUBLIC_DOMAIN/api/billing/webhook`

4. Select the `collection_event` event and paste the same value as `INTASEND_WEBHOOK_CHALLENGE`.
5. Complete a test checkout using the app's `/subscribe` page. Confirm the return page shows active only after the status endpoint confirms the invoice, currency, amount and reference. Check the IntaSend webhook delivery logs.
6. Move to live keys only after a successful sandbox sign-in, checkout, webhook and status-verification test.

The browser never sends the amount that will be charged as the source of truth: the server chooses the plan price. A redirect back to Streamivio is not proof of payment. Membership activation relies on verified provider status and is not granted solely because a customer opened the return URL.

## 4. Readiness and API smoke checks

After deployment, open:

`GET /api/system/status`

It returns only boolean readiness indicators for authentication, verification-email delivery and the payment gateway. It never returns environment values or secrets. A `ready` response means the expected variables are present, **not** that credentials have passed a provider transaction—still complete the sandbox test above.

Useful routes:

| Route | Purpose |
| --- | --- |
| `GET /api/system/status` | Secret-free configuration readiness |
| `GET /api/auth/me` | Current signed-in account |
| `POST /api/auth/request-code` | Request a six-digit sign-up or sign-in code |
| `POST /api/auth/verify-code` | Verify the code and create an HTTP-only session cookie |
| `POST /api/auth/signout` | End the current session |
| `POST /api/billing/checkout` | Start a server-priced IntaSend checkout; requires a verified session |
| `GET /api/billing/status?session=…` | Verify a checkout and report membership status |
| `POST /api/billing/webhook` | Receive and independently verify IntaSend payment events |

Example request to send a sign-up code:

```http
POST /api/auth/request-code
Content-Type: application/json

{"email":"you@example.com","mode":"signup"}
```

Example request to verify it:

```http
POST /api/auth/verify-code
Content-Type: application/json

{"email":"you@example.com","code":"123456"}
```

Only use the example code above as a shape for the request; a real code is generated and emailed on demand. Do not log or commit a real verification code.

## 5. Deployment note

Vercel has recently rejected deployments for the project's free deployment quota. GitHub code commits do not bypass that restriction. After the deployment allowance is available, confirm that the latest deployment is Ready, check `/api/system/status`, then run the sandbox tests. Until then, changes are committed source code and are not yet guaranteed to be serving the production website.
