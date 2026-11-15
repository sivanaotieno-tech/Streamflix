import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://mangareader-api.vercel.app/api/v1";
const allowed = new Set(["trending", "featured", "search"]);

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "trending";
  const query = (request.nextUrl.searchParams.get("q") || "").trim();

  if (!allowed.has(type)) {
    return NextResponse.json({ detail: "Unsupported catalogue request." }, { status: 400 });
  }
  if (type === "search" && (query.length < 2 || query.length > 100)) {
    return NextResponse.json({ detail: "Search must be between 2 and 100 characters." }, { status: 400 });
  }

  const endpoint = type === "search"
    ? `${API_BASE}/search/${encodeURIComponent(query)}`
    : `${API_BASE}/${type}`;

  try {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      next: { revalidate: type === "search" ? 60 : 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ detail: "The external manga catalogue returned an error." }, { status: 502 });
    }
    const payload = await upstream.json();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": type === "search" ? "public, s-maxage=60, stale-while-revalidate=120" : "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ detail: "The external manga catalogue could not be reached." }, { status: 503 });
  }
}
