import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/auth";
import { getLatestRecordForEmail, getRecord, intasendStatus, updateRecord, type SubscriptionRecord } from "@/lib/billing";
import { getHyperswitchPayment, normalizeHyperswitchStatus } from "@/lib/hyperswitch";

export const runtime = "nodejs";
const COOKIE_NAME = "streamivio_member";

function expiryFrom(now: Date, period: SubscriptionRecord["period"]) {
  const next = new Date(now);
  if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

async function verifyAndActivate(record: SubscriptionRecord) {
  if (record.status === "ACTIVE" && record.expiresAt && Date.parse(record.expiresAt) > Date.now()) return record;
  if (record.provider === "hyperswitch") {
    if (!record.paymentId) return record;
    const payment = await getHyperswitchPayment(record.paymentId);
    const metadata = payment.metadata || {};
    const verifiedAmount = Number(payment.amount);
    const matches = payment.payment_id === record.paymentId &&
      payment.currency === record.currency &&
      verifiedAmount === record.amount * 100 &&
      metadata.streamivio_reference === record.apiRef &&
      metadata.streamivio_plan === record.plan &&
      metadata.streamivio_period === record.period;
    if (!matches) {
      console.error("Hyperswitch payment verification mismatch", record.apiRef);
      return record;
    }
    const status = normalizeHyperswitchStatus(payment.status);
    if (status === "ACTIVE" && record.status !== "ACTIVE") {
      const paidAt = new Date();
      const updated: SubscriptionRecord = {
        ...record, status: "ACTIVE", paidAt: paidAt.toISOString(),
        expiresAt: expiryFrom(paidAt, record.period).toISOString(),
      };
      await updateRecord(updated);
      return updated;
    }
    if ((status === "FAILED" || status === "CANCELED") && record.status === "PENDING") {
      const updated: SubscriptionRecord = { ...record, status };
      await updateRecord(updated);
      return updated;
    }
    return record;
  }
  if (!record.invoiceId && !record.checkoutId) return record;
  const verified = await intasendStatus(record.invoiceId, record.checkoutId);
  const invoice = verified.invoice;
  if (!invoice || (record.invoiceId && invoice.invoice_id !== record.invoiceId)) return record;

  const amount = Number(invoice.value);
  const matches = invoice.currency === record.currency &&
    amount === record.amount &&
    invoice.api_ref === record.apiRef;

  if (!matches) {
    console.error("Subscription payment verification mismatch", record.apiRef);
    return record;
  }

  if (invoice.state === "COMPLETE" && record.status !== "ACTIVE") {
    const paidAt = new Date();
    const updated: SubscriptionRecord = {
      ...record,
      invoiceId: invoice.invoice_id || record.invoiceId,
      status: "ACTIVE",
      paidAt: paidAt.toISOString(),
      expiresAt: expiryFrom(paidAt, record.period).toISOString(),
    };
    await updateRecord(updated);
    return updated;
  }

  if (["FAILED", "CANCELED"].includes(String(invoice.state)) && record.status === "PENDING") {
    const updated: SubscriptionRecord = {
      ...record,
      invoiceId: invoice.invoice_id || record.invoiceId,
      status: invoice.state as "FAILED" | "CANCELED",
    };
    await updateRecord(updated);
    return updated;
  }

  return record;
}

function publicStatus(record: SubscriptionRecord | null) {
  if (!record) return { status: "inactive" };
  const expired = record.status === "ACTIVE" && record.expiresAt && Date.parse(record.expiresAt) <= Date.now();
  return {
    status: record.status === "ACTIVE" && !expired ? "active" : record.status === "PENDING" ? "pending" : "inactive",
    plan: record.plan,
    period: record.period,
    expiresAt: record.expiresAt || null,
    email: record.email,
  };
}

function statusResponse(record: SubscriptionRecord | null) {
  const response = NextResponse.json(publicStatus(record), { headers: { "Cache-Control": "no-store" } });
  if (record?.status === "ACTIVE" && record.expiresAt && Date.parse(record.expiresAt) > Date.now()) {
    response.cookies.set(COOKIE_NAME, record.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(record.expiresAt),
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get("session");
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  try {
    // Checkout return page: session comes from a server-created, random checkout reference.
    if (session) {
      let record = await getRecord(session);
      if (!record) return NextResponse.json({ status: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      record = await verifyAndActivate(record);
      return statusResponse(record);
    }

    // Normal account page: show membership based on the verified account email, not only this browser.
    const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (authToken) {
      const user = await getAuthenticatedUser(authToken);
      if (user) {
        let accountRecord = await getLatestRecordForEmail(user.email);
        if (accountRecord) {
          accountRecord = await verifyAndActivate(accountRecord);
          return statusResponse(accountRecord);
        }
      }
    }

    // Legacy browser membership cookie remains a fallback for existing sessions.
    if (!cookieToken) return NextResponse.json({ status: "inactive" }, { headers: { "Cache-Control": "no-store" } });
    let record = await getRecord(cookieToken);
    if (!record) return NextResponse.json({ status: "inactive" }, { headers: { "Cache-Control": "no-store" } });
    record = await verifyAndActivate(record);
    return statusResponse(record);
  } catch (error) {
    console.error("Subscription status check failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not verify subscription status right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
