import { randomUUID } from "node:crypto";

const BASE_URL = "https://api.intasend.com/api/v1/";

export type PlanId = "plus" | "premium";
export type BillingPeriod = "monthly" | "yearly";
export type SubscriptionRecord = {
  sessionToken: string;
  apiRef: string;
  email: string;
  plan: PlanId;
  period: BillingPeriod;
  amount: number;
  currency: "KES";
  status: "PENDING" | "ACTIVE" | "FAILED" | "CANCELED";
  invoiceId?: string;
  checkoutUrl?: string;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
};

export const PLANS = {
  plus: {
    name: "Streamivio Plus",
    prices: { monthly: 299, yearly: 2990 },
  },
  premium: {
    name: "Streamivio Premium",
    prices: { monthly: 499, yearly: 4990 },
  },
} as const;

export function envReady() {
  return Boolean(
    process.env.INTASEND_PUBLISHABLE_KEY &&
      process.env.INTASEND_SECRET_KEY &&
      process.env.INTASEND_WEBHOOK_CHALLENGE &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)
  );
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Subscription storage is not configured.");
  return { url: url.replace(/\/$/, ""), token };
}

export async function redisCommand<T = unknown>(...args: (string | number)[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Subscription storage request failed.");
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error("Subscription storage request failed.");
  return payload.result as T;
}

export async function saveRecord(record: SubscriptionRecord) {
  await redisCommand(
    "SET",
    `streamivio:subscription:${record.sessionToken}`,
    JSON.stringify(record),
    "EX",
    60 * 60 * 24 * 400
  );
  await redisCommand(
    "SET",
    `streamivio:order:${record.apiRef}`,
    record.sessionToken,
    "EX",
    60 * 60 * 24 * 400
  );
}

export async function getRecord(sessionToken: string): Promise<SubscriptionRecord | null> {
  if (!/^[a-f0-9-]{36}$/i.test(sessionToken)) return null;
  const value = await redisCommand<string | null>("GET", `streamivio:subscription:${sessionToken}`);
  if (!value) return null;
  try {
    return JSON.parse(value) as SubscriptionRecord;
  } catch {
    return null;
  }
}

export async function findSessionByReference(apiRef: string): Promise<string | null> {
  if (!/^sv-[a-f0-9-]{36}$/i.test(apiRef)) return null;
  return (await redisCommand<string | null>("GET", `streamivio:order:${apiRef}`)) || null;
}

export async function updateRecord(record: SubscriptionRecord) {
  await saveRecord(record);
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!value) throw new Error("APP_URL is not configured.");
  return value.replace(/\/$/, "");
}

export async function intasendStatus(invoiceId: string) {
  const secret = process.env.INTASEND_SECRET_KEY;
  if (!secret) throw new Error("Payment provider is not configured.");
  const response = await fetch(`${BASE_URL}payment/status/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not verify payment with IntaSend.");
  return (await response.json()) as {
    invoice?: {
      invoice_id?: string;
      state?: string;
      value?: string | number;
      currency?: string;
      api_ref?: string;
    };
  };
}

export function makeSessionToken() {
  return randomUUID();
}
