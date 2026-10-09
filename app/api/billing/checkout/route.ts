import { NextResponse } from "next/server";
import { appUrl, envReady, makeSessionToken, PLANS, saveRecord, type BillingPeriod, type PlanId, type SubscriptionRecord } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!envReady()) {
    return NextResponse.json(
      { error: "Subscriptions are not configured yet. The site owner must finish the payment and database setup." },
      { status: 503 }
    );
  }

  let body: { email?: unknown; plan?: unknown; period?: unknown; firstName?: unknown; lastName?: unknown; phoneNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide valid checkout details." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const plan = body.plan;
  const period = body.period;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if ((plan !== "plus" && plan !== "premium") || (period !== "monthly" && period !== "yearly")) {
    return NextResponse.json({ error: "Choose a valid subscription plan and billing period." }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim().replace(/[\s()-]/g, "").slice(0, 20) : "";
  if (phoneNumber && !/^\+?[0-9]{9,15}$/.test(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid phone number, including country code." }, { status: 400 });
  }

  const sessionToken = makeSessionToken();
  const apiRef = `sv-${sessionToken}`;
  const selectedPlan = PLANS[plan as PlanId];
  const amount = selectedPlan.prices[period as BillingPeriod];
  const app = appUrl();

  try {
    const checkoutResponse = await fetch("https://api.intasend.com/api/v1/checkout/", {
      method: "POST",
      headers: {
        "X-IntaSend-Public-API-Key": process.env.INTASEND_PUBLISHABLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "KES",
        email,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        api_ref: apiRef,
        unique_api_ref: true,
        host: app,
        redirect_url: `${app}/subscribe/return?session=${encodeURIComponent(sessionToken)}`,
      }),
      cache: "no-store",
    });

    const checkout = (await checkoutResponse.json()) as { id?: string; url?: string; invoice_id?: string; error?: string; detail?: string };
    if (!checkoutResponse.ok || !checkout.url || !(checkout.invoice_id || checkout.id)) {
      console.error("IntaSend checkout creation failed", checkoutResponse.status, checkout.error || checkout.detail || "No checkout URL returned");
      return NextResponse.json({ error: "The payment provider could not start checkout. Please try again later." }, { status: 502 });
    }

    const record: SubscriptionRecord = {
      sessionToken,
      apiRef,
      email,
      plan: plan as PlanId,
      period: period as BillingPeriod,
      amount,
      currency: "KES",
      status: "PENDING",
      invoiceId: checkout.invoice_id,
      checkoutUrl: checkout.url,
      createdAt: new Date().toISOString(),
    };
    await saveRecord(record);
    return NextResponse.json({ checkoutUrl: checkout.url, sessionToken });
  } catch (error) {
    console.error("Subscription checkout error", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
