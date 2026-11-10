import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, firebaseAuthReady, getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!firebaseAuthReady()) {
    return NextResponse.json({ ok: false, error: "Firebase sign-in is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { idToken?: unknown; clear?: unknown };
  if (body.clear === true) {
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

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken || idToken.length > 8192) {
    return NextResponse.json({ ok: false, error: "A valid Firebase sign-in token is required." }, { status: 400 });
  }

  const user = await getAuthenticatedUser(idToken);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Your sign-in could not be verified. Please sign in again." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: { email: user.email } }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(AUTH_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 55 * 60,
  });
  return response;
}
