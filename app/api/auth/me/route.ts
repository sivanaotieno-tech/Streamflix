import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, firebaseAuthReady, getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const user = await getAuthenticatedUser(token);
    if (!user && !firebaseAuthReady()) {
      return NextResponse.json({ authenticated: false, configured: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      authenticated: Boolean(user),
      configured: true,
      user: user ? { email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt, isDemo: user.isDemo === true, readOnly: user.isDemo === true } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Streamivio session lookup failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ authenticated: false, configured: true, error: "Could not check the session right now." }, {
      status: 503, headers: { "Cache-Control": "no-store" }
    });
  }
}
