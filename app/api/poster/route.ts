import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ poster: null, error: "External poster lookup is disabled until artwork rights are confirmed." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
