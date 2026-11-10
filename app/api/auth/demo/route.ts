import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createDemoSessionToken, demoAuthReady } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!demoAuthReady()) {
    return NextResponse.json({ ok: false, error: "The Streamivio demo account is not configured yet." }, { status: 503 });
  }
  const token = createDemoSessionToken();
  const response = NextResponse.json({
    ok: true,
    user: { email: "demo@streamivio.com", isDemo: true, readOnly: true },
    expiresIn: 12 * 60 * 60,
  }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
