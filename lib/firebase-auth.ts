import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export const AUTH_COOKIE_NAME = "streamivio_auth";
export const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 5;

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
};

export function firebaseAuthReady() {
  return Boolean(
    (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function getAuthenticatedUser(sessionCookie?: string | null): Promise<AuthUser | null> {
  if (!sessionCookie || !firebaseAuthReady()) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    if (!decoded.uid || !decoded.email) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}

export async function saveFirebaseUserProfile(user: AuthUser) {
  const ref = adminDb().collection("users").doc(user.uid);
  const existing = await ref.get();
  await ref.set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    lastLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
}
