# Streamivio production setup

## 1. Firebase accounts

Follow [Firebase setup](FIREBASE_SETUP.md). Configure Firebase Authentication with Email/Password and Google providers, create Firestore, add the deployed domains to Authorized domains, and add the Firebase web and Admin service-account environment variables in Vercel.

The sign-in page now uses Firebase Authentication. Email/password users must verify their email before Streamivio creates a server session. Google sign-in uses Firebase's verified identity. Firestore stores account profiles.

## 2. Payment and transaction storage

The current subscription checkout still uses the existing payment adapter and Upstash Redis transaction ledger. Firebase Authentication does not itself process payments.

Configure the variables for the provider you actually use:

- IntaSend: INTASEND_PUBLISHABLE_KEY, INTASEND_SECRET_KEY, INTASEND_WEBHOOK_CHALLENGE.
- Upstash transaction storage: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
- Public website origin: NEXT_PUBLIC_APP_URL and optional server-only APP_URL.
- Optional Hyperswitch sandbox: PAYMENT_PROVIDER=hyperswitch, HYPERSWITCH_ENV=sandbox, HYPERSWITCH_API_KEY, and HYPERSWITCH_WEBHOOK_SECRET.

Do not configure both payment providers by assumption. Keep secrets server-side and never commit them.

For IntaSend, configure the collection-event webhook at https://YOUR_PUBLIC_DOMAIN/api/billing/webhook with the same challenge configured in Vercel. The server verifies invoice amount, currency and reference before activating membership.

## 3. Test before production

1. Register a new email/password account and verify its email.
2. Sign in and confirm GET /api/auth/me returns the expected verified account.
3. Test Google sign-in if enabled.
4. Sign out and confirm the server session cookie is cleared.
5. Complete a payment-provider sandbox checkout.
6. Confirm the payment return page remains pending until the provider confirms the exact amount, currency and reference.
7. Check webhook delivery and the production deployment logs.

GET /api/system/status exposes configuration-presence flags only. It does not prove that credentials are valid or a payment has succeeded.
