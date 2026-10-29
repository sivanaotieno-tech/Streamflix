import { NextResponse } from "next/server";
import {
  AUTH_CODE_TTL_SECONDS,
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_SECONDS,
  authOtpKey,
  authRedisCommand,
  authSessionKey,
  authStorageReady,
  authUserKey,
  createAuthSessionToken,
  equalHex,
  hashAuthCode,
  normalizeEmail,
  type AuthCodeRecord,
  type AuthUser,
} from "@/lib/auth";

export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!authStorageReady()) return error("Email sign-in storage is not configured yet.", 503);

  let body: { email?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return error("Enter the six-digit code from your email.", 400);
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return error("Enter a valid email address.", 400);
  if (!/^\d{6}$/.test(code)) return error("Enter all six digits from your email.", 400);

  try {
    const rawOtp = await authRedisCommand<string | null>("GET", authOtpKey(email));
    if (!rawOtp) return error("That code has expired or was already used. Request a new code.", 400);

    let otp: AuthCodeRecord;
    try {
      otp = JSON.parse(rawOtp) as AuthCodeRecord;
    } catch {
      await authRedisCommand("DEL", authOtpKey(email));
      return error("That code is no longer valid. Request a new one.", 400);
    }

    const issuedAt = Date.parse(otp.issuedAt);
    if (
      !Number.isFinite(issuedAt) ||
      issuedAt > Date.now() + 30_000 ||
      Date.now() - issuedAt > AUTH_CODE_TTL_SECONDS * 1000 ||
      !Number.isInteger(otp.attempts) ||
      otp.attempts < 0 ||
      otp.attempts >= 5 ||
      (otp.mode !== "signup" && otp.mode !== "signin") ||
      !/^[a-f0-9]{64}$/i.test(otp.codeHash)
    ) {
      await authRedisCommand("DEL", authOtpKey(email));
      return error("That code expired or is no longer valid. Request a new code.", 400);
    }

    const suppliedHash = hashAuthCode(email, code);
    if (!equalHex(suppliedHash, otp.codeHash)) {
      otp.attempts += 1;
      if (otp.attempts >= 5) {
        await authRedisCommand("DEL", authOtpKey(email));
        return error("Too many incorrect attempts. Request a new code.", 429);
      }
      const secondsLeft = Math.max(1, AUTH_CODE_TTL_SECONDS - Math.floor((Date.now() - issuedAt) / 1000));
      await authRedisCommand("SET", authOtpKey(email), JSON.stringify(otp), "EX", secondsLeft);
      return error("That code does not match. Check the email and try again.", 400);
    }

    // Atomically consume the exact OTP record we checked. This prevents two simultaneous
    // verification requests from exchanging the same one-time code for two sessions.
    const consumed = await authRedisCommand<number>(
      "EVAL",
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      authOtpKey(email),
      rawOtp
    );
    if (consumed !== 1) {
      return error("That code was already used or replaced. Request a new code.", 409);
    }

    const userKey = authUserKey(email);
    const existingRaw = await authRedisCommand<string | null>("GET", userKey);
    if (otp.mode === "signin" && !existingRaw) {
      await authRedisCommand("DEL", authOtpKey(email));
      return error("No account exists for this email yet. Choose Create account and request a new code.", 404);
    }

    const now = new Date().toISOString();
    let user: AuthUser;
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as AuthUser;
        user = {
          email,
          createdAt: existing.createdAt || now,
          lastLoginAt: now,
        };
      } catch {
        user = { email, createdAt: now, lastLoginAt: now };
      }
    } else {
      user = { email, createdAt: now, lastLoginAt: now };
    }

    await authRedisCommand("SET", userKey, JSON.stringify(user));
    const token = createAuthSessionToken();
    await authRedisCommand("SET", authSessionKey(token), email, "EX", AUTH_SESSION_TTL_SECONDS);
    await authRedisCommand("DEL", authOtpKey(email));

    const response = NextResponse.json({
      ok: true,
      user: { email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
    }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_SESSION_TTL_SECONDS,
    });
    return response;
  } catch (err) {
    console.error("Streamivio code verification failed", err instanceof Error ? err.message : "unknown error");
    return error("We could not verify the code right now. Please try again shortly.", 503);
  }
}
