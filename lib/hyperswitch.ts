import { createHmac, timingSafeEqual } from "node:crypto";

const SANDBOX_URL = "https://sandbox.hyperswitch.io";

export type HyperswitchPayment = {
  payment_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  payment_link?: { link?: string; secure_link?: string | null };
  error?: string;
  message?: string;
};

export function hyperswitchConfigured() {
  const key = process.env.HYPERSWITCH_API_KEY?.trim() || "";
  const environment = process.env.HYPERSWITCH_ENV?.trim() || "sandbox";
  // This initial integration intentionally supports sandbox only. Production requires a separate review.
  return environment === "sandbox" && key.startsWith("sk_snd_") &&
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function apiUrl() {
  if ((process.env.HYPERSWITCH_ENV || "sandbox") !== "sandbox") {
    throw new Error("Only Hyperswitch sandbox is enabled in this integration.");
  }
  return SANDBOX_URL;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.HYPERSWITCH_API_KEY?.trim();
  if (!key) throw new Error("Hyperswitch sandbox API key is not configured.");
  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Hyperswitch API request failed", response.status);
    throw new Error("Hyperswitch sandbox could not complete the request.");
  }
  return payload as T;
}

export async function createHyperswitchPaymentLink(input: {
  amountKes: number;
  email: string;
  name?: string;
  phone?: string;
  reference: string;
  returnUrl: string;
  plan: string;
  period: string;
}) {
  // Hyperswitch amount uses the currency's minor unit. Keep the user-facing plan price in KES.
  const body = {
    amount: Math.round(input.amountKes * 100),
    currency: "KES",
    confirm: false,
    capture_method: "automatic",
    payment_link: true,
    return_url: input.returnUrl,
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
    ...(input.phone ? { phone: input.phone.replace(/^\\+/, ""), phone_country_code: input.phone.startsWith("+") ? "+" : undefined } : {}),
    description: `Streamivio ${input.plan} ${input.period} membership`,
    metadata: {
      streamivio_reference: input.reference,
      streamivio_plan: input.plan,
      streamivio_period: input.period,
    },
  };
  return request<HyperswitchPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getHyperswitchPayment(paymentId: string) {
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(paymentId)) throw new Error("Invalid payment reference.");
  return request<HyperswitchPayment>(`/payments/${encodeURIComponent(paymentId)}?force_sync=true`);
}

/**
 * Verify Hyperswitch's webhook signature over the exact raw body.
 * Configure the same payment_response_hash_key from the Hyperswitch webhook setup.
 */
export function verifyHyperswitchWebhook(rawBody: string, timestamp: string, signature: string) {
  const secret = process.env.HYPERSWITCH_WEBHOOK_SECRET?.trim();
  if (!secret || !timestamp || !signature || !/^\\d{10,13}$/.test(timestamp)) return false;
  const timestampMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha512", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = signature.replace(/^sha512=/i, "").trim();
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function normalizeHyperswitchStatus(status: string | undefined): "ACTIVE" | "FAILED" | "CANCELED" | "PENDING" {
  switch ((status || "").toLowerCase()) {
    case "succeeded":
    case "charged": return "ACTIVE";
    case "failed": return "FAILED";
    case "cancelled":
    case "canceled": return "CANCELED";
    default: return "PENDING";
  }
}
