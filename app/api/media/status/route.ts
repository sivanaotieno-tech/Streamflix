import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = (process.env.STREAMIVIO_API_URL || process.env.NEXT_PUBLIC_STREAMIVIO_API_URL || "").replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "Set STREAMIVIO_API_URL in the Vercel project environment." }, { status: 503 });
  try {
    const [healthResponse, providersResponse] = await Promise.all([
      fetch(base + "/media/health", { cache: "no-store", signal: AbortSignal.timeout(7000) }),
      fetch(base + "/media/providers", { cache: "no-store", signal: AbortSignal.timeout(7000) }),
    ]);
    const [health, providers] = await Promise.all([healthResponse.json(), providersResponse.json()]);
    if (!healthResponse.ok || !providersResponse.ok) return NextResponse.json({ error: "Streamivio API returned an error while checking providers." }, { status: 502 });
    return NextResponse.json({ health, providers }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach the Streamivio API. Check STREAMIVIO_API_URL and API deployment status." }, { status: 502 });
  }
}
