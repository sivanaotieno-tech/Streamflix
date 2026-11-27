import { NextRequest, NextResponse } from "next/server";
import { embyFetch, getEmbyUserId, embyIsConfigured } from "@/lib/emby-server";
import { AUTH_COOKIE_NAME, authStorageReady, getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = [
  "Overview",
  "ProductionYear",
  "ProviderIds",
  "Genres",
  "RunTimeTicks",
  "ImageTags",
  "ParentId",
  "IndexNumber",
  "ParentIndexNumber",
  "SeriesName",
  "SeasonName",
].join(",");

export async function GET(request: NextRequest) {
  if (!authStorageReady()) {
    return NextResponse.json({ available: false, configured: false, items: [], totalRecordCount: 0, message: "Streamivio sign-in is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const user = await getAuthenticatedUser(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!user) {
    return NextResponse.json({ available: false, authenticated: false, items: [], totalRecordCount: 0, message: "Sign in to Streamivio to access your Emby library." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (!embyIsConfigured()) {
    return NextResponse.json({
      available: false,
      configured: false,
      items: [],
      totalRecordCount: 0,
      message: "Connect Emby to load your personal media library.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const params = request.nextUrl.searchParams;
  const startIndex = Math.max(0, Math.min(100000, Number.parseInt(params.get("startIndex") || "0", 10) || 0));
  const requestedLimit = Number.parseInt(params.get("limit") || "100", 10) || 100;
  const limit = Math.max(1, Math.min(200, requestedLimit));
  const userId = getEmbyUserId();

  const query = new URLSearchParams({
    Recursive: "true",
    IncludeItemTypes: "Movie,Series,Episode",
    Fields: fields,
    StartIndex: String(startIndex),
    Limit: String(limit),
    EnableImages: "true",
  });
  if (userId) query.set("UserId", userId);

  try {
    const response = await embyFetch("/Items?" + query.toString());
    if (!response.ok) {
      return NextResponse.json({
        available: false,
        configured: true,
        items: [],
        totalRecordCount: 0,
        message: response.status === 401 || response.status === 403
          ? "Emby rejected the credentials or the configured user does not have library access."
          : "Emby could not return the library.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.Items) ? payload.Items.map((item: any) => ({
      id: String(item.Id || ""),
      title: String(item.Name || ""),
      type: String(item.Type || "").toLowerCase(),
      overview: typeof item.Overview === "string" ? item.Overview : "",
      year: item.ProductionYear ? String(item.ProductionYear) : "",
      imdbId: typeof item.ProviderIds?.Imdb === "string" ? item.ProviderIds.Imdb : null,
      genres: Array.isArray(item.Genres) ? item.Genres : [],
      runtimeTicks: typeof item.RunTimeTicks === "number" ? item.RunTimeTicks : null,
      imageTag: typeof item.ImageTags?.Primary === "string" ? item.ImageTags.Primary : null,
      parentId: item.ParentId ? String(item.ParentId) : null,
      seasonNumber: typeof item.ParentIndexNumber === "number" ? item.ParentIndexNumber : null,
      episodeNumber: typeof item.IndexNumber === "number" ? item.IndexNumber : null,
      seriesName: typeof item.SeriesName === "string" ? item.SeriesName : null,
      seasonName: typeof item.SeasonName === "string" ? item.SeasonName : null,
    })).filter((item: any) => item.id && item.title) : [];

    return NextResponse.json({
      available: true,
      configured: true,
      items,
      totalRecordCount: Number(payload?.TotalRecordCount) || items.length,
      startIndex,
      limit,
      message: items.length
        ? "Your Emby library is connected."
        : "Your Emby library is empty. Add media you own or are licensed to use, then scan the library in Emby.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      available: false,
      configured: true,
      items: [],
      totalRecordCount: 0,
      message: "Unable to reach Emby. Check the server URL and network connection.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
