import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, firebaseAuthReady, getAuthenticatedUser } from "@/lib/firebase-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!firebaseAuthReady()) {
    return NextResponse.json({ authenticated: false, configured: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const user = await getAuthenticatedUser(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  return NextResponse.json({
    authenticated: Boolean(user),
    configured: true,
    user: user ? { uid: user.uid, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
