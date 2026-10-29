import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "streamivio_auth";
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_CODE_TTL_SECONDS = 10 * 60;
export const AUTH_CODE_LENGTH = 6;

export type AuthUser = {
  email: string;
  createdAt: string;
  lastLoginAt: string;
};

export type AuthCodeRecord = {
  codeHash: string;
  mode: "signup" | "signin";
  attempts: number;
  issuedAt: string;
};

const redisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Authentication storage is not configured.");
  return { url: url.replace(/\/$/, ""), token };
};

export async function authRedisCommand<T = unknown>(...args: (string | number)[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Authentication storage request failed.");
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error("Authentication storage request failed.");
  return payload.result as T;
}

export function authStorageReady() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.STREAMIVIO_AUTH_SECRET
  );
}

export function emailDeliveryReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.STREAMIVIO_EMAIL_FROM);
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

function emailKey(email: string) {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function authUserKey(email: string) {
  return `streamivio:auth:user:${emailKey(email)}`;
}

export function authOtpKey(email: string) {
  return `streamivio:auth:otp:${emailKey(email)}`;
}

export function authCooldownKey(email: string) {
  return `streamivio:auth:cooldown:${emailKey(email)}`;
}

export function authSessionKey(token: string) {
  return `streamivio:auth:session:${token}`;
}

export function authRateLimitKey(kind: "email" | "ip", value: string) {
  return `streamivio:auth:rate:${kind}:${createHash("sha256").update(value).digest("hex")}`;
}

function getAuthSecret() {
  const secret = process.env.STREAMIVIO_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("STREAMIVIO_AUTH_SECRET must contain at least 32 characters.");
  return secret;
}

export function hashAuthCode(email: string, code: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export function equalHex(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createOtpCode() {
  return randomBytes(4).readUInt32BE(0) % 1_000_000;
}

export function createAuthSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function getAuthenticatedUser(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const email = await authRedisCommand<string | null>("GET", authSessionKey(token));
  if (!email) return null;
  const raw = await authRedisCommand<string | null>("GET", authUserKey(email));
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (!user || normalizeEmail(user.email) !== normalizeEmail(email)) return null;
    return user;
  } catch {
    return null;
  }
}

export function renderVerificationEmail(code: string, mode: "signup" | "signin") {
  const phrase = mode === "signup" ? "sign-up" : "sign-in";
  const boxes = code.split("").map((digit) =>
    `<td width="16.6%" align="center" valign="middle" style="padding:0 4px"><div style="height:84px;line-height:84px;border:2px solid #ed1c24;border-radius:18px;background:#090909;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:52px;font-weight:800;text-align:center">${digit}</div></td>`
  ).join("");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Your Streamivio verification code</title></head>
<body style="margin:0;padding:0;background:#080808;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#080808"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#080808">
<tr><td align="center" style="padding:18px 16px 4px"><div style="font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:clamp(38px,8vw,76px);line-height:1;font-weight:900;letter-spacing:-2px;color:#e50914">STREAMIVIO</div></td></tr>
<tr><td align="center" style="padding:30px 18px 8px;font-size:28px;line-height:1.25;font-weight:700;color:#f5f5f5">Dear User,</td></tr>
<tr><td align="center" style="padding:0 18px 28px;font-size:clamp(21px,4vw,30px);line-height:1.45;color:#f5f5f5">Here is your <strong>6-character ${phrase} code.</strong></td></tr>
<tr><td align="center" style="padding:0 8px 32px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%"><tr>${boxes}</tr></table></td></tr>
<tr><td align="center" style="padding:0 18px 10px;font-size:16px;line-height:1.6;color:#a3a3a3">This code expires in 10 minutes for your security.</td></tr>
<tr><td align="center" style="padding:0 18px 32px;font-size:16px;line-height:1.6;color:#a3a3a3">If you didn't request this, you can safely ignore this email.</td></tr>
<tr><td align="center" style="border-top:1px solid #242424;padding:18px 18px 0;font-size:12px;line-height:1.6;color:#666666">Sent by Streamivio Security Assistant. Never share your verification code with anyone.</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderVerificationEmailText(code: string, mode: "signup" | "signin") {
  const phrase = mode === "signup" ? "sign-up" : "sign-in";
  return `STREAMIVIO

Dear User,

Here is your 6-character ${phrase} code:

${code}

This code expires in 10 minutes for your security.
If you didn't request this, you can safely ignore this email.

Sent by Streamivio Security Assistant. Never share your verification code with anyone.`;
}
