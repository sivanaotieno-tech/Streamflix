import { NextRequest, NextResponse } from "next/server";
import { getRecord, intasendStatus, updateRecord, type SubscriptionRecord } from "@/lib/billing";

export const runtime = "nodejs";
const COOKIE_NAME = "streamivio_member";

function expiryFrom(now: Date, period: SubscriptionRecord["period"]) {
  const next = new Date(now);
  if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

async function verifyAndActivate(record: SubscriptionRecord) {
  if (!record.invoiceId) return record;
  const verified = await intasendStatus(record.invoiceId);
  const invoice = verified.invoice;
  if (!invoice || invoice.invoice_id !== record.invoiceId) return record;

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
      status: "ACTIVE",
      paidAt: paidAt.toISOString(),
      expiresAt: expiryFrom(paidAt, record.period).toISOString(),
    };
    await updateRecord(updated);
    return updated;
  }

  if (["FAILED", "CANCELED"].includes(String(invoice.state)) && record.status === "PENDING") {
    const updated = { ...record, status: invoice.state as "FAILED" | "CANCELED" };
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

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get("session");
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  try {
    if (session) {
      let record = await getRecord(session);
      if (!record) return NextResponse.json({ status: "not_found" }, { status: 404 });
      record = await verifyAndActivate(record);
      const response = NextResponse.json(publicStatus(record));
      if (record.status === "ACTIVE" && record.expiresAt && Date.parse(record.expiresAt) > Date.now()) {
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

    if (!cookieToken) return NextResponse.json({ status: "inactive" });
    let record = await getRecord(cookieToken);
    if (!record) return NextResponse.json({ status: "inactive" });
    record = await verifyAndActivate(record);
    return NextResponse.json(publicStatus(record));
  } catch (error) {
    console.error("Subscription status check failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not verify subscription status right now." }, { status: 503 });
  }
}
