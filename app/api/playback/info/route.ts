import { NextResponse } from "next/server";

// Legacy compatibility endpoint. Streamivio no longer queries third-party
// streaming providers for playback availability or episode metadata.
export async function GET() {
  return NextResponse.json({
    available: false,
    error: "Third-party playback-provider lookups are disabled. Configure authorised catalogue metadata and MP4/HLS media sources instead.",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
