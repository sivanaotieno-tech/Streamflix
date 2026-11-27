import { NextResponse } from "next/server";
import { embyFetch, embyIsConfigured } from "@/lib/emby-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!embyIsConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Emby is not configured yet. Add the server URL and API key to server environment variables.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await embyFetch("/System/Info/Public");
    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: response.status === 401 || response.status === 403
          ? "Emby rejected the server credentials."
          : "Emby could not complete the connection check.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const info = await response.json();
    return NextResponse.json({
      configured: true,
      connected: true,
      serverName: typeof info?.ServerName === "string" ? info.ServerName : "Emby Server",
      version: typeof info?.Version === "string" ? info.Version : undefined,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach Emby.";
    return NextResponse.json({
      configured: true,
      connected: false,
      message: message.includes("EMBY_SERVER_URL") || message.includes("Emby must")
        ? message
        : "Unable to reach Emby. Check the server URL and network connection.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
