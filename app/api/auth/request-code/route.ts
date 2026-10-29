import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  AUTH_CODE_TTL_SECONDS,
  authCooldownKey,
  authOtpKey,
  authRateLimitKey,
  authRedisCommand,
  authStorageReady,
  createOtpCode,
  emailDeliveryReady,
  hashAuthCode,
  normalizeEmail,
  renderVerificationEmail,
  renderVerificationEmailText,
  type AuthCodeRecord,
} from "@/lib/auth";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function incrementWindow(key: string, windowSeconds: number) {
  const count = await authRedisCommand<number>("INCR", key);
  if (count === 1) await authRedisCommand("EXPIRE", key, windowSeconds);
  return count;
}

export async function POST(request: Request) {
  if (!authStorageReady() || !emailDeliveryReady()) {
    return jsonError("Email sign-in is not configured yet. The site owner must configure Resend, Upstash Redis, and the Streamivio authentication secret.", 503);
  }

  let body: { email?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Please enter a valid email address.", 400);
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const mode = body.mode === "signin" ? "signin" : body.mode === "signup" ? "signup" : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return jsonError("Enter a valid email address.", 400);
  }
  if (!mode) return jsonError("Choose Sign in or Create account.", 400);

  const forward = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  // X-Forwarded-For is ordered client-first, followed by proxies. Use the first value,
  // not the last shared proxy address, so per-IP throttling is effective behind Vercel.
  const ip = (realIp || forward.split(",")[0] || "unknown").trim().slice(0, 128);

  try {
    const cooldown = await authRedisCommand<string | null>("SET", authCooldownKey(email), "1", "NX", "EX", 60);
    if (cooldown !== "OK") {
      return NextResponse.json({ ok: false, error: "Please wait 60 seconds before requesting another code." }, {
        status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" }
      });
    }

    const emailRequests = await incrementWindow(authRateLimitKey("email", email), 3600);
    const ipRequests = await incrementWindow(authRateLimitKey("ip", ip), 3600);
    if (emailRequests > 8 || ipRequests > 30) {
      await authRedisCommand("DEL", authCooldownKey(email));
      return NextResponse.json({ ok: false, error: "Too many code requests. Please try again later." }, {
        status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" }
      });
    }

    const code = String(createOtpCode()).padStart(6, "0");
    const record: AuthCodeRecord = {
      codeHash: hashAuthCode(email, code),
      mode,
      attempts: 0,
      issuedAt: new Date().toISOString(),
    };
    await authRedisCommand("SET", authOtpKey(email), JSON.stringify(record), "EX", AUTH_CODE_TTL_SECONDS);

    const from = process.env.STREAMIVIO_EMAIL_FROM!;
    const resendKey = process.env.RESEND_API_KEY!;
    const phrase = mode === "signup" ? "sign-up" : "sign-in";
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Streamivio/1.0",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Your 6-character Streamivio ${phrase} code`,
        html: renderVerificationEmail(code, mode),
        text: renderVerificationEmailText(code, mode),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!emailResponse.ok) {
      await authRedisCommand("DEL", authOtpKey(email), authCooldownKey(email));
      console.error("Streamivio verification email provider returned HTTP", emailResponse.status);
      return jsonError("We could not send the email right now. Check the email-service setup or try again shortly.", 502);
    }

    return NextResponse.json({
      ok: true,
      message: "If this email can continue, a six-digit code is on its way. Check your inbox and spam folder.",
      expiresInSeconds: AUTH_CODE_TTL_SECONDS,
      resendAfterSeconds: 60,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Streamivio verification code request failed", error instanceof Error ? error.message : "unknown error");
    return jsonError("Email sign-in is temporarily unavailable. Please try again shortly.", 503);
  }
}
