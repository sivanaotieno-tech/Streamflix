import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Provider = { id: string; name: string; enabled: boolean; kind: "api" | "direct" | "embed"; note: string };

export async function GET() {
  // Providers are surfaced only when the operator has explicitly configured an
  // endpoint and confirmed the source's distribution rights.
  const configured: Provider[] = [
    { id: "streamivio", name: "Streamivio native", enabled: true, kind: "direct", note: "Authorized MP4/HLS assets in the catalogue or resolver." },
    { id: "bingeapi", name: "BingeAPI adapter", enabled: Boolean(process.env.STREAMIVIO_BINGEAPI_URL && process.env.STREAMIVIO_BINGEAPI_AUTHORIZED === "true"), kind: "api", note: "Requires an operator-configured API endpoint and rights confirmation." },
    { id: "vidsrc", name: "Vidsrc adapter", enabled: Boolean(process.env.STREAMIVIO_VIDSRC_URL && process.env.STREAMIVIO_VIDSRC_AUTHORIZED === "true"), kind: "embed", note: "Disabled unless an operator configures an endpoint and confirms distribution authorization." },
  ];
  return NextResponse.json({ providers: configured }, { headers: { "Cache-Control": "no-store" } });
}
