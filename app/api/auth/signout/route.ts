import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authRedisCommand, authSessionKey, authStorageReady } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  try {
    if (token && authStorageReady() && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      await authRedisCommand("DEL", authSessionKey(token));
    }
  } catch (error) {
    console.error("Streamivio sign-out session cleanup failed", error instanceof Error ? error.message : "unknown error");
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
