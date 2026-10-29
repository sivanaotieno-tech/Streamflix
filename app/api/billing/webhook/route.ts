import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findSessionByReference, getRecord, intasendStatus, updateRecord, type SubscriptionRecord } from "@/lib/billing";

export const runtime = "nodejs";

function addPeriod(now: Date, period: SubscriptionRecord["period"]) {
  const end = new Date(now);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export async function POST(request: Request) {
  const challenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (!challenge) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  const event = payload as {
    challenge?: unknown;
    topic?: unknown;
    api_ref?: unknown;
    invoice_id?: unknown;
  };

  const providedChallenge = typeof event.challenge === "string" ? Buffer.from(event.challenge) : Buffer.alloc(0);
  const expectedChallenge = Buffer.from(challenge);
  if (
    providedChallenge.length !== expectedChallenge.length ||
    providedChallenge.length === 0 ||
    !timingSafeEqual(providedChallenge, expectedChallenge)
  ) {
    return NextResponse.json({ error: "Invalid webhook challenge." }, { status: 401 });
  }
  if (event.topic !== "collection_event" || !event.api_ref || !event.invoice_id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const sessionToken = await findSessionByReference(event.api_ref);
    if (!sessionToken) return NextResponse.json({ received: true, ignored: true });
    let record = await getRecord(sessionToken);
    if (!record || record.apiRef !== event.api_ref || (record.invoiceId && record.invoiceId !== event.invoice_id)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Do not trust webhook state alone: confirm invoice state, amount, currency and reference with IntaSend.
    const result = await intasendStatus(event.invoice_id);
    const invoice = result.invoice;
    if (!invoice || invoice.invoice_id !== event.invoice_id ||
        invoice.api_ref !== record.apiRef ||
        invoice.currency !== record.currency ||
        Number(invoice.value) !== record.amount) {
      return NextResponse.json({ error: "Payment verification did not match this subscription." }, { status: 409 });
    }

    if (invoice.state === "COMPLETE" && record.status !== "ACTIVE") {
      const paidAt = new Date();
      record = {
        ...record,
        invoiceId: event.invoice_id,
        status: "ACTIVE",
        paidAt: paidAt.toISOString(),
        expiresAt: addPeriod(paidAt, record.period),
      };
      await updateRecord(record);
    } else if (invoice.state === "FAILED" || invoice.state === "CANCELED") {
      if (record.status === "PENDING") {
        record = { ...record, invoiceId: event.invoice_id, status: invoice.state };
        await updateRecord(record);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("IntaSend webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 503 });
  }
}
