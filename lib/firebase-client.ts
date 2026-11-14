import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const required = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function firebaseClientConfigured() {
  return required.every((key) => Boolean(process.env[key]?.trim()));
}

function getFirebaseConfig() {
  if (!firebaseClientConfigured()) {
    throw new Error("Firebase web configuration is missing. Add the NEXT_PUBLIC_FIREBASE_* values in Vercel.");
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };
}

const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
export const firebaseAuth = getAuth(app);
