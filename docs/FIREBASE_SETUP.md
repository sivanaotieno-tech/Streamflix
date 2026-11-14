# Streamivio Firebase setup

Streamivio uses Firebase Authentication for customer accounts and Firestore for user profiles. Vercel hosts the Next.js app. Payment checkout remains a separate provider integration; payment credentials must never be placed in client-side Firebase configuration.

## 1. Firebase Console

Open the Firebase project named `streamivio`.

1. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
2. In **Authentication → Settings → Authorized domains**, add the deployed Streamivio hostname and any custom domain.
3. In **Firestore Database**, create a database in production mode. Choose a region close to the majority of your users and consider data-residency requirements before selecting it.
4. In **Project settings → General → Your apps**, register or select the Web app and copy its web configuration.
5. In **Project settings → Service accounts**, generate a private key for a service account. Treat the JSON as a secret; do not commit it.

## 2. Vercel environment variables

Add the following values in the Streamivio Vercel project. Set public web config variables for Production, Preview and Development as appropriate. Keep Admin credentials server-side only.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Usually `streamivio.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `streamivio` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app appId |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Web app sender ID (optional for sign-in) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Web app storage bucket (optional) |
| `FIREBASE_PROJECT_ID` | `streamivio` |
| `FIREBASE_CLIENT_EMAIL` | Service-account client_email |
| `FIREBASE_PRIVATE_KEY` | Service-account private_key, including BEGIN/END lines; preserve newlines or use `\\n` |

Do not use `NEXT_PUBLIC_` for the service-account email or private key. Never paste private keys into GitHub, source files, chat, or client code.

## 3. Firestore security rules

The Admin SDK bypasses Firestore client rules. For client-side access, start with deny-by-default and add narrowly scoped rules only for features that need direct client access. Example baseline:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Server-created profile documents are written through Firebase Admin after a verified ID token is exchanged for an HTTP-only session cookie.

## 4. Sign-in behavior

- Email/password account creation sends Firebase's verification email.
- Unverified email/password accounts cannot establish a Streamivio server session.
- Google sign-in uses Firebase Authentication and must return a verified email.
- The browser exchanges a Firebase ID token for an HTTP-only, Secure-in-production, SameSite=Lax session cookie.
- Server routes verify the Firebase session cookie and check revocation before trusting the account.
- Firestore stores the user's UID, email, display name, verification state and timestamps.

## 5. Billing note

The current checkout implementation is separate from Firebase Authentication. It still uses the existing payment provider integration and Upstash Redis for checkout/subscription transaction records. Do not remove those environment variables until a separately tested Firestore billing migration has been completed. Membership activation must continue to depend on server-side payment verification, never on the browser redirect.

After adding variables, redeploy the Vercel project and test: new email account + verification, sign-in, Google sign-in, sign-out, checkout initiation, provider verification and webhook delivery. A successful build does not prove that provider credentials or payment webhooks work.
