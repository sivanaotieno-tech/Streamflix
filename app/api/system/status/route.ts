import { NextResponse } from "next/server";
import { authStorageReady, emailDeliveryReady } from "@/lib/auth";
import { envReady as billingEnvironmentReady } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, secret-free readiness probe for sign-in, email delivery and checkout.
 * It deliberately returns booleans only—never environment values or key names.
 */
export async function GET() {
  const authStorage = authStorageReady();
  const email = emailDeliveryReady();
  const billing = billingEnvironmentReady();

  return NextResponse.json({
    status: authStorage && email && billing ? "ready" : "needs_configuration",
    services: {
      authentication: { ready: authStorage },
      verificationEmail: { ready: authStorage && email },
      paymentGateway: { ready: billing },
    },
    note: "Readiness only. It does not send email or create a payment. Complete a sandbox sign-in and payment to verify live provider connectivity.",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
