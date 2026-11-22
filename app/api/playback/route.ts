import { NextRequest, NextResponse } from "next/server";
import { catalog } from "../../data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaFormat = "mp4" | "hls";
const RIGHTS_STATUSES = new Set(["licensed", "owned", "public_domain"]);

const isSafeHttps = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
};

const isImdbId = (value: unknown): value is string =>
  typeof value === "string" && /^tt\d{5,12}$/i.test(value);

const hasRightsRecord = (item: any) =>
  item?.distribution_authorized === true &&
  RIGHTS_STATUSES.has(String(item?.rights_status || "").toLowerCase()) &&
  typeof item?.rights_reference === "string" &&
  item.rights_reference.trim().length > 0;

const normalizeTitle = (value: string) =>
  value.replace(/\s*\(\d{4}\)\s*$/, "").normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const isTvType = (value: string) =>
  ["tv", "tvshow", "tv show", "series", "tvseries", "tvminiseries", "anime", "documentary", "documentaries", "kids", "reality"]
    .includes(value.replaceAll(" ", "").trim().toLowerCase());

function mediaFormat(value: string, explicit?: unknown): MediaFormat | null {
  const path = (() => { try { return new URL(value).pathname.toLowerCase(); } catch { return ""; } })();
  if (explicit === "hls" || path.endsWith(".m3u8")) return "hls";
  if (explicit === "mp4" || path.endsWith(".mp4")) return "mp4";
  return null;
}

async function resolveHovod(titleId: string) {
  const base = (process.env.STREAMIVIO_API_URL || process.env.NEXT_PUBLIC_STREAMIVIO_API_URL || "").replace(/\/+$/, "");
  if (!base) return null;
  let endpoint: URL;
  try {
    endpoint = new URL("/media/playback/" + encodeURIComponent(titleId), base);
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") return null;
  } catch { return null; }

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (response.status === 404 || response.status === 503) return null;
  if (!response.ok) {
    return { error: typeof payload.detail === "string" ? payload.detail : "Playback is not authorised for this title.", status: response.status };
  }
  if (payload.available !== true) return null;
  const playerUrl = isSafeHttps(payload.player_url) ? payload.player_url : "";
  const streamUrl = isSafeHttps(payload.stream_url) ? payload.stream_url : "";
  const format = playerUrl ? "embed" : (payload.format === "hls" && streamUrl ? "hls" : null);
  if (!format) return null;
  return { available: true, format, stream_url: streamUrl || undefined, player_url: playerUrl || undefined, title: payload.title, source: "hovod", notice: payload.notice };
}

async function resolveConfiguredSource(imdbId: string) {
  const base = (process.env.STREAMIVIO_RESOLVER_URL || "").replace(/\/+$/, "");
  if (!base) return null;
  try {
    const endpoint = new URL("/stream/" + encodeURIComponent(imdbId), base);
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") return null;
    const response = await fetch(endpoint, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const payload: any = await response.json();
    if (payload.available !== true || payload.distribution_authorized !== true || !isSafeHttps(payload.stream_url)) return null;
    const format = mediaFormat(payload.stream_url, payload.format);
    if (!format) return null;
    return { stream_url: payload.stream_url, format };
  } catch (error) {
    console.error("Streamivio authorised resolver failed:", error);
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

  if (!id && !title && !imdbId) return NextResponse.json({ available: false, error: "Choose a title first." }, { status: 400 });
  if ((season && !episode) || (!season && episode) || (season && (!/^\d+$/.test(season) || Number(season) < 1)) || (episode && (!/^\d+$/.test(episode) || Number(episode) < 1))) {
    return NextResponse.json({ available: false, error: "Provide a valid season and episode together." }, { status: 400 });
  }
  if ((season || episode) && !isTvType(requestedType)) return NextResponse.json({ available: false, error: "Season and episode are only valid for TV titles." }, { status: 400 });

  const local = catalog.find((item: any) => String(item.id) === id) ||
    (title ? catalog.find((item: any) => normalizeTitle(String(item.title || "")) === normalizeTitle(title) && isTvType(String(item.type || "")) === isTvType(requestedType)) : undefined);
  const titleId = String((local as any)?.id || id || "");
  if (titleId) {
    try {
      const hovod = await resolveHovod(titleId);
      if (hovod && "error" in hovod) return NextResponse.json({ available: false, error: hovod.error }, { status: hovod.status });
      if (hovod) return NextResponse.json(hovod, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("Streamivio API playback lookup failed:", error);
    }
  }

  const resolvedId = imdbId || (local as any)?.imdb_id || (local as any)?.imdbId;
  if (hasRightsRecord(local)) {
    const localUrl = typeof (local as any)?.video_url === "string" ? (local as any).video_url : "";
    if (localUrl && isSafeHttps(localUrl)) {
      const format = mediaFormat(localUrl, (local as any)?.video_format);
      if (format) return NextResponse.json({ available: true, playback_verified: false, format, stream_url: localUrl, title: (local as any)?.title || title, source: "authorised-catalogue", notice: "The configured source still requires an end-to-end playback check." }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  if (isImdbId(resolvedId)) {
    const resolved = await resolveConfiguredSource(resolvedId);
    if (resolved) return NextResponse.json({ available: true, playback_verified: false, ...resolved, content_id: resolvedId, title: (local as any)?.title || title || undefined, source: "streamivio-authorised-resolver", notice: "The configured source still requires an end-to-end playback check." }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    available: false,
    playback_verified: false,
    error: "No authorised playback source is configured for this title. Add a verified rights record and Hovod asset, or configure an authorised MP4/HLS source.",
    metadata_id: isImdbId(resolvedId) ? resolvedId : undefined,
  }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
