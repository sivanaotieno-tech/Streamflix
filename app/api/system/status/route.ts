import { NextResponse } from "next/server";
import { firebaseAuthReady } from "@/lib/firebase-auth";
import { envReady as billingEnvironmentReady } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Secret-free readiness flags. This checks configuration presence, not successful provider transactions. */
export async function GET() {
  const firebaseClient = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  const firebaseAdmin = firebaseAuthReady();
  const billing = billingEnvironmentReady();
  return NextResponse.json({
    status: firebaseClient && firebaseAdmin && billing ? "ready" : "needs_configuration",
    services: {
      authentication: { ready: firebaseClient && firebaseAdmin },
      firebase: { ready: firebaseClient && firebaseAdmin },
      paymentGateway: { ready: billing },
    },
    note: "Readiness only. Complete Firebase email verification, a sandbox checkout and a verified payment webhook before relying on production membership.",
  }, { headers: { "Cache-Control": "no-store" } });
}
