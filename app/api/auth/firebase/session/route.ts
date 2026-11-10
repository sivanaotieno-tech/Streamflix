import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, firebaseAuthReady, verifyFirebaseIdToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!firebaseAuthReady()) {
    return NextResponse.json({ ok: false, error: "Firebase sign-in is not configured." }, { status: 503 });
  }

  let body: { idToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid Firebase sign-in token is required." }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const user = await verifyFirebaseIdToken(idToken);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Your sign-in could not be verified. Confirm your email and try again." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: { email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
  }, { headers: { "Cache-Control": "no-store" } });

  // Firebase refreshes this ID token automatically. The client sync component renews this
  // short-lived HTTP-only cookie whenever Firebase rotates the token.
  response.cookies.set(AUTH_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 55 * 60,
  });
  return response;
}
