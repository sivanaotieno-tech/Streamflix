import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ detail: "External scraper-based manga catalogue is disabled. Use Streamivio's curated titles and publisher links." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
