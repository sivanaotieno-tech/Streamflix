import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findSessionByReference, getRecord, intasendStatus, updateRecord, type SubscriptionRecord } from "@/lib/billing";
import { getHyperswitchPayment, normalizeHyperswitchStatus, verifyHyperswitchWebhook } from "@/lib/hyperswitch";

export const runtime = "nodejs";

function addPeriod(now: Date, period: SubscriptionRecord["period"]) {
  const end = new Date(now);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export async function POST(request: Request) {
  if (process.env.PAYMENT_PROVIDER === "hyperswitch") {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature-512") || "";
    if (!verifyHyperswitchWebhook(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: "Invalid Hyperswitch webhook signature." }, { status: 401 });
    }
    let payload: any;
    try { payload = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    const content = payload?.content?.object || payload?.data?.object || payload?.data || payload;
    const paymentId = typeof content?.payment_id === "string" ? content.payment_id :
      typeof content?.id === "string" ? content.id : "";
    const reference = content?.metadata?.streamivio_reference;
    if (!paymentId || typeof reference !== "string") {
      return NextResponse.json({ received: true, ignored: true });
    }
    try {
      const sessionToken = await findSessionByReference(reference);
      if (!sessionToken) return NextResponse.json({ received: true, ignored: true });
      let record = await getRecord(sessionToken);
      if (!record || record.provider !== "hyperswitch" || record.paymentId !== paymentId || record.apiRef !== reference) {
        return NextResponse.json({ received: true, ignored: true });
      }
      // Webhook is only a notification. Fetch the canonical payment from Hyperswitch before updating membership.
      const payment = await getHyperswitchPayment(paymentId);
      const metadata = payment.metadata || {};
      if (payment.payment_id !== record.paymentId || payment.currency !== record.currency ||
          Number(payment.amount) !== record.amount * 100 ||
          metadata.streamivio_reference !== record.apiRef ||
          metadata.streamivio_plan !== record.plan ||
          metadata.streamivio_period !== record.period) {
        return NextResponse.json({ error: "Payment verification did not match this subscription." }, { status: 409 });
      }
      const status = normalizeHyperswitchStatus(payment.status);
      if (status === "ACTIVE" && record.status !== "ACTIVE") {
        const paidAt = new Date();
        record = { ...record, status: "ACTIVE", paidAt: paidAt.toISOString(), expiresAt: addPeriod(paidAt, record.period) };
        await updateRecord(record);
      } else if ((status === "FAILED" || status === "CANCELED") && record.status === "PENDING") {
        record = { ...record, status };
        await updateRecord(record);
      }
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Hyperswitch webhook processing failed", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 503 });
    }
  }

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
  if (
    event.topic !== "collection_event" ||
    typeof event.api_ref !== "string" || !event.api_ref ||
    typeof event.invoice_id !== "string" || !event.invoice_id
  ) {
    return NextResponse.json({ received: true, ignored: true });
  }
  const apiRef = event.api_ref;
  const invoiceId = event.invoice_id;

  try {
    const sessionToken = await findSessionByReference(apiRef);
    if (!sessionToken) return NextResponse.json({ received: true, ignored: true });
    let record = await getRecord(sessionToken);
    if (!record || record.apiRef !== apiRef || (record.invoiceId && record.invoiceId !== invoiceId)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Do not trust webhook state alone: confirm invoice state, amount, currency and reference with IntaSend.
    const result = await intasendStatus(invoiceId);
    const invoice = result.invoice;
    if (!invoice || invoice.invoice_id !== invoiceId ||
        invoice.api_ref !== record.apiRef ||
        invoice.currency !== record.currency ||
        Number(invoice.value) !== record.amount) {
      return NextResponse.json({ error: "Payment verification did not match this subscription." }, { status: 409 });
    }

    if (invoice.state === "COMPLETE" && record.status !== "ACTIVE") {
      const paidAt = new Date();
      record = {
        ...record,
        invoiceId,
        status: "ACTIVE",
        paidAt: paidAt.toISOString(),
        expiresAt: addPeriod(paidAt, record.period),
      };
      await updateRecord(record);
    } else if (invoice.state === "FAILED" || invoice.state === "CANCELED") {
      if (record.status === "PENDING") {
        record = { ...record, invoiceId, status: invoice.state };
        await updateRecord(record);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("IntaSend webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 503 });
  }
}
