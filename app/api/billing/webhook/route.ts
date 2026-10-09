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

  let event: {
    challenge?: string;
    topic?: string;
    api_ref?: string;
    invoice_id?: string;
  };
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!event.challenge || event.challenge !== challenge) {
    return NextResponse.json({ error: "Invalid webhook challenge." }, { status: 401 });
  }
  if (event.topic !== "collection_event" || !event.api_ref || !event.invoice_id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const sessionToken = await findSessionByReference(event.api_ref);
    if (!sessionToken) return NextResponse.json({ received: true, ignored: true });
    let record = await getRecord(sessionToken);
    if (!record || record.apiRef !== event.api_ref || record.invoiceId !== event.invoice_id) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Do not trust webhook state alone: confirm invoice state, amount, currency and reference with IntaSend.
    const result = await intasendStatus(record.invoiceId);
    const invoice = result.invoice;
    if (!invoice || invoice.invoice_id !== record.invoiceId ||
        invoice.api_ref !== record.apiRef ||
        invoice.currency !== record.currency ||
        Number(invoice.value) !== record.amount) {
      return NextResponse.json({ error: "Payment verification did not match this subscription." }, { status: 409 });
    }

    if (invoice.state === "COMPLETE" && record.status !== "ACTIVE") {
      const paidAt = new Date();
      record = {
        ...record,
        status: "ACTIVE",
        paidAt: paidAt.toISOString(),
        expiresAt: addPeriod(paidAt, record.period),
      };
      await updateRecord(record);
    } else if (invoice.state === "FAILED" || invoice.state === "CANCELED") {
      if (record.status === "PENDING") {
        record = { ...record, status: invoice.state };
        await updateRecord(record);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("IntaSend webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed; retry delivery." }, { status: 503 });
  }
}
