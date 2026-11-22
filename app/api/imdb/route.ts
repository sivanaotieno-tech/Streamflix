import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ available: false, error: "External IMDb metadata lookup is disabled until Streamivio has an appropriate commercial data licence." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
