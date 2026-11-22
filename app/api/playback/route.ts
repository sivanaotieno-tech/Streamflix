import { NextRequest, NextResponse } from "next/server";
import { catalog } from "../../data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaFormat = "mp4" | "hls";

const isSafeHttps = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

const isImdbId = (value: unknown): value is string =>
  typeof value === "string" && /^tt\d{5,12}$/i.test(value);

const normalizeTitle = (value: string) =>
  value.replace(/\s*\(\d{4}\)\s*$/, "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isTvType = (value: string) =>
  ["tv", "tvshow", "tv show", "series", "tvseries", "tvminiseries", "anime", "documentary", "documentaries", "kids", "reality"]
    .includes(value.replaceAll(" ", "").trim().toLowerCase());

function mediaFormat(value: string, explicit?: unknown): MediaFormat | null {
  const path = (() => {
    try { return new URL(value).pathname.toLowerCase(); } catch { return ""; }
  })();
  if (explicit === "hls" || path.endsWith(".m3u8")) return "hls";
  if (explicit === "mp4" || path.endsWith(".mp4")) return "mp4";
  return null;
}

async function resolveConfiguredSource(imdbId: string) {
  const base = (process.env.STREAMIVIO_RESOLVER_URL || "").replace(/\/+$/, "");
  if (!base) return null;
  try {
    const endpoint = new URL("/stream/" + encodeURIComponent(imdbId), base);
    if (endpoint.protocol !== "https:") return null;
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;
    if (record.available !== true || !isSafeHttps(record.stream_url)) return null;
    const format = mediaFormat(record.stream_url, record.format);
    if (!format) return null;
    return { stream_url: record.stream_url, format };
  } catch (error) {
    console.error("Streamivio configured playback resolver failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = (params.get("id") || "").trim();
  const title = (params.get("title") || "").trim();
  const requestedType = (params.get("type") || "movie").trim().toLowerCase();
  const imdbId = (params.get("imdb_id") || params.get("imdbId") || "").trim();
  const season = params.get("season");
  const episode = params.get("episode");

  if (!id && !title && !imdbId) {
    return NextResponse.json({ available: false, error: "Choose a title first." }, { status: 400 });
  }
  if ((season && !episode) || (!season && episode) || (season && (!/^\d+$/.test(season) || Number(season) < 1)) || (episode && (!/^\d+$/.test(episode) || Number(episode) < 1))) {
    return NextResponse.json({ available: false, error: "Provide a valid season and episode together." }, { status: 400 });
  }
  if ((season || episode) && !isTvType(requestedType)) {
    return NextResponse.json({ available: false, error: "Season and episode are only valid for TV titles." }, { status: 400 });
  }

  const local = catalog.find((item: any) => String(item.id) === id)
    || (title ? catalog.find((item: any) =>
      normalizeTitle(String(item.title || "")) === normalizeTitle(title)
      && (isTvType(String(item.type || "")) === isTvType(requestedType))
    ) : undefined);

  const localUrl = typeof (local as any)?.video_url === "string" ? (local as any).video_url : "";
  if (localUrl && isSafeHttps(localUrl)) {
    const format = mediaFormat(localUrl, (local as any)?.video_format);
    if (format) {
      return NextResponse.json({
        available: true,
        playback_verified: false,
        format,
        stream_url: localUrl,
        title: (local as any)?.title || title || undefined,
        source: "configured-catalog-media",
        notice: "A media source is configured. Actual playback still depends on the media host and browser.",
      }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  const resolvedId = imdbId || (local as any)?.imdb_id || (local as any)?.imdbId;
  if (isImdbId(resolvedId)) {
    const resolved = await resolveConfiguredSource(resolvedId);
    if (resolved) {
      return NextResponse.json({
        available: true,
        playback_verified: false,
        ...resolved,
        content_id: resolvedId,
        title: (local as any)?.title || title || undefined,
        source: "configured-streamivio-resolver",
        notice: "A media source is configured. Actual playback still depends on the media host and browser.",
      }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  return NextResponse.json({
    available: false,
    playback_verified: false,
    error: "No authorized playback source is configured for this title yet. Add a licensed MP4/HLS URL to the Streamivio catalogue or connect your authorized resolver.",
    metadata_id: isImdbId(resolvedId) ? resolvedId : undefined,
  }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
