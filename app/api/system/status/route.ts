import { NextResponse } from "next/server";
import { firebaseAuthReady } from "@/lib/firebase-auth";
import { firebaseClientConfigured } from "@/lib/firebase-client";
import { envReady as billingEnvironmentReady } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Secret-free readiness flags. This checks configuration presence, not successful provider transactions. */
export async function GET() {
  const firebaseClient = firebaseClientConfigured();
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
