# Streamivio — Hyperswitch sandbox setup

This branch adds an **opt-in, sandbox-only** Hyperswitch hosted payment-link flow. It preserves IntaSend as the default: the app uses Hyperswitch only when `PAYMENT_PROVIDER=hyperswitch`. Do not enable it on production until sandbox testing and a separate production review are complete.

## Configure Vercel Preview (recommended)

Use a Preview environment first, not Production. Add these variables in Vercel → Project → Settings → Environment Variables, selecting Preview:

| Variable | Value |
| --- | --- |
| `PAYMENT_PROVIDER` | `hyperswitch` |
| `HYPERSWITCH_ENV` | `sandbox` |
| `HYPERSWITCH_API_KEY` | Hyperswitch **sandbox** secret API key (server-side only; must use the sandbox key prefix accepted by this integration) |
| `HYPERSWITCH_WEBHOOK_SECRET` | The webhook `payment_response_hash_key` configured for the sandbox webhook |
| `UPSTASH_REDIS_REST_URL` | Existing Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Existing Upstash Redis REST token |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS origin for the preview/test deployment, with no trailing slash |
| `APP_URL` | Optional server-side fallback for the same origin |

Keep the existing authentication and email variables required by Streamivio sign-in. Never paste secrets into GitHub, source code, screenshots, chat, or client-side variables. Do not prefix the Hyperswitch secret with `NEXT_PUBLIC_`.

If Hyperswitch issues a sandbox API key that does not match the prefix validation in `lib/hyperswitch.ts`, do not weaken the validation blindly: confirm the exact sandbox key format in your Hyperswitch account/docs and adjust the validator intentionally.

## Configure Hyperswitch

1. Sign in to the Hyperswitch sandbox / Control Centre at the official Hyperswitch sandbox.
2. Confirm the account is a sandbox account and obtain its sandbox API key.
3. Configure at least one **sandbox connector** in the Control Centre. The payment methods visible in checkout depend on the configured connector, its test credentials, country/currency support and enabled methods.
4. Configure a sandbox webhook pointing to:
   `https://YOUR-PREVIEW-DOMAIN/api/billing/webhook`
5. Use the webhook's `payment_response_hash_key` as `HYPERSWITCH_WEBHOOK_SECRET`. Ensure the webhook's signing scheme and the timestamp/signature headers match the implementation in `lib/hyperswitch.ts`. If the account's generated webhook format differs, update and test signature verification before relying on webhook delivery.
6. Redeploy the Preview deployment so the server picks up the variables.

Hosted sandbox API: `https://sandbox.hyperswitch.io`. Production endpoints and production keys are intentionally not enabled by this change.

## Test checklist

1. Open the deployed Preview site and sign in using a verified email.
2. Visit `/subscribe`. Confirm Plus and Premium prices remain:
   - Plus: KSh 299/month or KSh 2,990/year
   - Premium: KSh 499/month or KSh 4,990/year
3. Start checkout and confirm it redirects to a Hyperswitch sandbox payment link.
4. Use only the test payment methods/cards documented by the configured sandbox connector. Do not use real card details or real money.
5. Test a successful payment, a declined/failed payment, a canceled checkout and an abandoned checkout.
6. Confirm a browser return URL alone never activates membership. The server must retrieve the canonical payment from Hyperswitch and match payment ID, KES currency, amount, reference, plan and period before activation.
7. Confirm duplicate webhook deliveries do not extend membership twice, invalid signatures are rejected, and mismatched amount/currency/reference stays pending.
8. Check `GET /api/system/status`; `ready` only means required environment variables are present. It does **not** prove that a connector or payment flow works.
9. Check Vercel function logs and Hyperswitch sandbox payment/webhook logs. Do not log API keys or card data.

## Safeguards and current scope

- The server computes prices from the fixed Streamivio plan table; the browser cannot set the charged amount.
- A signed webhook is treated as a notification only; the backend fetches the canonical payment from Hyperswitch before changing membership.
- The checkout status endpoint independently fetches the canonical payment before activating a subscription.
- Hyperswitch sandbox is the only mode supported by this branch. Live processing, recurring auto-renewal, refunds, and a verified M-Pesa connector are **not** claimed as configured.
- Existing IntaSend code remains available when `PAYMENT_PROVIDER` is unset or set to `intasend`.
- This integration must be built and tested before merging. Do not describe payments as live until a real production connector and its credentials are configured and verified.
