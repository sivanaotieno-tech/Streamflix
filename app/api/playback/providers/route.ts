import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Provider = { id: string; name: string; enabled: boolean; kind: "api" | "direct" | "embed"; note: string };

export async function GET() {
  // BingeAPI is integrated as a direct embed provider. The player itself still
  // checks the title's distribution authorization before rendering an embed.
  const providers: Provider[] = [
    { id: "streamivio", name: "Streamivio native", enabled: true, kind: "direct", note: "Authorized MP4/HLS assets in the catalogue or resolver." },
    { id: "bingeapi", name: "BingeAPI", enabled: true, kind: "embed", note: "Direct BingeAPI embed integration; playback is shown only for titles Streamivio is authorized to distribute." },
    { id: "vidsrc", name: "Vidsrc adapter", enabled: false, kind: "embed", note: "Not enabled. No provider endpoint or distribution authorization has been verified." },
  ];

  return NextResponse.json({ providers }, { headers: { "Cache-Control": "no-store" } });
}
