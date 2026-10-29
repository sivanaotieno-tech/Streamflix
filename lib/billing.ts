import { createHash, randomUUID } from "node:crypto";
import { hyperswitchConfigured } from "@/lib/hyperswitch";

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
  checkoutId?: string;
  checkoutUrl?: string;
  provider?: "intasend" | "hyperswitch";
  paymentId?: string;
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

function validAppOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const secure = url.protocol === "https:";
    const localDevelopment =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return (secure || localDevelopment) &&
      !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function intasendKeysMatch() {
  const publishable = process.env.INTASEND_PUBLISHABLE_KEY?.trim() || "";
  const secret = process.env.INTASEND_SECRET_KEY?.trim() || "";
  const publishableMode = /^ISPubKey_(test|live)_/.exec(publishable)?.[1];
  const secretMode = /^ISSecretKey_(test|live)_/.exec(secret)?.[1];
  return Boolean(publishableMode && secretMode && publishableMode === secretMode);
}

export function envReady() {
  if (process.env.PAYMENT_PROVIDER === "hyperswitch") return hyperswitchConfigured();
  const challenge = process.env.INTASEND_WEBHOOK_CHALLENGE?.trim() || "";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  return Boolean(
    intasendKeysMatch() &&
      challenge.length >= 16 &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      validAppOrigin(appOrigin)
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

const SUBSCRIPTION_TTL_SECONDS = 60 * 60 * 24 * 400;

function subscriptionEmailIndexKey(email: string) {
  const normalized = email.trim().toLocaleLowerCase("en-US");
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `streamivio:subscription-email:${hash}`;
}

export async function saveRecord(record: SubscriptionRecord) {
  await redisCommand(
    "SET",
    `streamivio:subscription:${record.sessionToken}`,
    JSON.stringify(record),
    "EX",
    SUBSCRIPTION_TTL_SECONDS
  );
  await redisCommand(
    "SET",
    `streamivio:order:${record.apiRef}`,
    record.sessionToken,
    "EX",
    SUBSCRIPTION_TTL_SECONDS
  );
  const emailIndexKey = subscriptionEmailIndexKey(record.email);
  await redisCommand("SADD", emailIndexKey, record.sessionToken);
  await redisCommand("EXPIRE", emailIndexKey, SUBSCRIPTION_TTL_SECONDS);
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

export async function getLatestRecordForEmail(email: string): Promise<SubscriptionRecord | null> {
  const sessionTokens = await redisCommand<string[]>("SMEMBERS", subscriptionEmailIndexKey(email));
  if (!Array.isArray(sessionTokens) || sessionTokens.length === 0) return null;

  const records = (await Promise.all(sessionTokens.map(getRecord)))
    .filter((record): record is SubscriptionRecord => Boolean(record));
  if (records.length === 0) return null;

  const byNewest = (left: SubscriptionRecord, right: SubscriptionRecord) =>
    Date.parse(right.createdAt) - Date.parse(left.createdAt);
  const now = Date.now();
  const active = records
    .filter((record) => record.status === "ACTIVE" && (!record.expiresAt || Date.parse(record.expiresAt) > now))
    .sort(byNewest);
  if (active.length) return active[0];

  const pending = records.filter((record) => record.status === "PENDING").sort(byNewest);
  if (pending.length) return pending[0];

  return [...records].sort(byNewest)[0] || null;
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

export async function intasendStatus(invoiceId?: string, checkoutId?: string) {
  const secret = process.env.INTASEND_SECRET_KEY;
  if (!secret) throw new Error("Payment provider is not configured.");
  if (!invoiceId && !checkoutId) throw new Error("A payment invoice or checkout reference is required.");

  type StatusResult = {
    invoice?: {
      invoice_id?: string;
      state?: string;
      value?: string | number;
      currency?: string;
      api_ref?: string;
    };
  };

  const lookup = async (body: Record<string, string>): Promise<StatusResult | null> => {
    const response = await fetch(`${BASE_URL}payment/status/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as StatusResult;
  };

  if (invoiceId) {
    const result = await lookup({ invoice_id: invoiceId });
    if (result?.invoice) return result;
    throw new Error("Could not verify payment with IntaSend.");
  }

  // IntaSend's checkout creation response may include a checkout id before an invoice id.
  // Try the documented checkout_id lookup first, then the compatible invoice_id form.
  const byCheckout = await lookup({ checkout_id: checkoutId! });
  if (byCheckout?.invoice) return byCheckout;
  const byInvoice = await lookup({ invoice_id: checkoutId! });
  if (byInvoice?.invoice) return byInvoice;
  throw new Error("Could not verify payment with IntaSend.");
}

export function makeSessionToken() {
  return randomUUID();
}
