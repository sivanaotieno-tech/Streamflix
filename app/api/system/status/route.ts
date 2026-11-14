import { NextResponse } from "next/server";
import { firebaseAuthReady, emailDeliveryReady } from "@/lib/auth";
import { envReady as billingEnvironmentReady } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, secret-free readiness probe for sign-in, email delivery and checkout.
 * It deliberately returns booleans only—never environment values or key names.
 */
export async function GET() {
  const authentication = firebaseAuthReady();
  const email = emailDeliveryReady();
  const billing = billingEnvironmentReady();

  return NextResponse.json({
    status: authentication && billing ? "ready" : "needs_configuration",
    services: {
      authentication: { ready: authentication },
      verificationEmail: { ready: email },
      paymentGateway: { ready: billing },
    },
    note: "Readiness only. Firebase verifies account sign-in; email readiness is informational. No payment is created by this check.",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
