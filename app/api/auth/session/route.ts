import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { AUTH_COOKIE_NAME, AUTH_SESSION_TTL_MS, saveFirebaseUserProfile } from "@/lib/firebase-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { idToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A Firebase sign-in token is required." }, { status: 400 });
  }
  if (typeof body.idToken !== "string" || body.idToken.length < 100 || body.idToken.length > 10000) {
    return NextResponse.json({ error: "The Firebase sign-in token is invalid." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(body.idToken, true);
    if (!decoded.email || decoded.email_verified !== true) {
      return NextResponse.json({ error: "Verify your email address before continuing." }, { status: 403 });
    }
    const sessionCookie = await adminAuth().createSessionCookie(body.idToken, { expiresIn: AUTH_SESSION_TTL_MS });
    await saveFirebaseUserProfile({
      uid: decoded.uid,
      email: decoded.email,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
      emailVerified: true,
    });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(AUTH_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(AUTH_SESSION_TTL_MS / 1000),
    });
    return response;
  } catch (error) {
    console.error("Firebase session creation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We could not establish your secure session. Please sign in again." }, { status: 401 });
  }
}
