import { NextRequest, NextResponse } from "next/server";
import { catalog } from "../../data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isSafeHttps = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

const normalizeTitle = (value: string) =>
  value
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isImdbId = (value: unknown): value is string =>
  typeof value === "string" && /^tt\d{5,12}$/i.test(value);

const isTvType = (value: string) =>
  ["tv", "anime", "documentary", "kids", "reality"].includes(value);

function embedResponse(imdbId: string, kind: "movie" | "tv", extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      available: true,
      format: "iframe",
      embed_url: `https://vidsrc.sh/embed/${kind}/${encodeURIComponent(imdbId)}`,
      content_id: imdbId,
      imdb_id: imdbId,
      ...extra,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function lookupImdbId(title: string, year: string | null, kind: "movie" | "tv") {
  // This package is an unofficial metadata scraper. It returns title metadata only.
  const { Client } = await import("@myno_21/imdb-scraper");
  const client = new Client();
  const lookup = kind === "tv"
    ? client.getShowViaName(title)
    : client.getMovieViaName(title);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const raw = await Promise.race([
    Promise.resolve(lookup),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("IMDb lookup timed out")), 7000);
    }),
  ]).finally(() => { if (timer) clearTimeout(timer); });

  // Package releases have returned arrays and wrapped/single-result objects.
  const payload: any = raw as any;
  const candidates: any[] = Array.isArray(payload) ? payload
    : Array.isArray(payload?.results) ? payload.results
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.searchResults) ? payload.searchResults
    : payload && typeof payload === "object" ? [payload] : [];

  const wanted = normalizeTitle(title);
  const match = candidates.find((item: any) => {
    const candidateTitle = String(item?.title || item?.name || item?.titleText || item?.originalTitle || "");
    const candidateId = item?.id || item?.imdbID || item?.imdb_id || item?.imdbId;
    if (normalizeTitle(candidateTitle) !== wanted || !isImdbId(candidateId)) return false;
    if (year) {
      const candidateYear = String(item?.year || item?.releaseYear || item?.release_date || "").match(/\d{4}/)?.[0];
      if (candidateYear && candidateYear !== year.slice(0, 4)) return false;
    }
    return true;
  });

  if (!match) return null;
  const imdbId = match.id || match.imdbID || match.imdb_id || match.imdbId;
  return {
    imdbId: String(imdbId),
    title: String(match.title || match.name || match.titleText || title),
    poster: typeof (match.poster || match.image || match.imageUrl) === "string"
      ? String(match.poster || match.image || match.imageUrl) : null,
    year: match.year || match.releaseYear || year,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = (params.get("id") || "").trim();
  const title = (params.get("title") || "").trim();
  const requestedType = (params.get("type") || "movie").trim().toLowerCase();
  const suppliedImdbId = (params.get("imdb_id") || params.get("imdbId") || "").trim();
  const kind: "movie" | "tv" = isTvType(requestedType) ? "tv" : "movie";

  if (!id && !title) {
    return NextResponse.json(
      { available: false, error: "Choose a title from the catalog or provide its title." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const local = catalog.find((item: any) => String(item.id) === id)
    || (title
      ? catalog.find((item: any) =>
          normalizeTitle(String(item.title || "")) === normalizeTitle(title)
          && (kind === "tv" ? isTvType(String(item.type || "")) : String(item.type || "") === "movie"),
        )
      : undefined);

  const catalogTitle = String((local as any)?.title || title);
  const catalogYear = (local as any)?.year ? String((local as any).year) : null;
  const catalogType = String((local as any)?.type || requestedType).toLowerCase();
  const resolvedKind: "movie" | "tv" = isTvType(catalogType) ? "tv" : "movie";

  // Prefer a configured, rights-cleared HTTPS source from the catalog.
  const localUrl = typeof (local as any)?.video_url === "string" ? (local as any).video_url : "";
  if (localUrl && isSafeHttps(localUrl)) {
    const path = new URL(localUrl).pathname.toLowerCase();
    const format = path.endsWith(".m3u8") ? "hls" : path.endsWith(".mp4") ? "mp4" : "external";
    return NextResponse.json(
      { available: true, stream_url: localUrl, format, source: "configured-authorized-catalog" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Prefer IDs supplied by title metadata, then IDs stored in the website catalog.
  const storedImdbId = suppliedImdbId || (local as any)?.imdb_id || (local as any)?.imdbId;
  if (isImdbId(storedImdbId)) {
    return embedResponse(storedImdbId, resolvedKind, { title: catalogTitle, source: suppliedImdbId ? "title-metadata" : "website-catalog" });
  }


  // IMDb's public suggestions endpoint is queried with punctuation variants.
  if (catalogTitle.length >= 2) {
    const queries = Array.from(new Set([
      catalogTitle,
      catalogTitle.replace(/[:：]/g, " ").replace(/[’']/g, ""),
      catalogTitle.replace(/\s*[-–—:]\s*/g, " ").trim(),
    ])).filter((query) => query.length >= 2);
    for (const query of queries) {
      try {
        const first = Array.from(query)[0]?.toLowerCase() || "";
        const suggestionUrl = "https://v2.sg.media-imdb.com/suggestion/" + encodeURIComponent(first) + "/" + encodeURIComponent(query) + ".json";
        const response = await fetch(suggestionUrl, {
          cache: "no-store",
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 Streamivio/1.0" },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) continue;
        const payload: any = await response.json();
        const results: any[] = Array.isArray(payload?.d) ? payload.d : [];
        const wanted = normalizeTitle(catalogTitle);
        const match = results.find((item: any) => {
          const candidateTitle = String(item?.l || item?.title || "");
          if (!isImdbId(item?.id) || normalizeTitle(candidateTitle) !== wanted) return false;
          const candidateYear = item?.y ? String(item.y) : "";
          if (catalogYear && candidateYear && candidateYear !== catalogYear.slice(0, 4)) return false;
          const qid = String(item?.qid || "").toLowerCase();
          if (resolvedKind === "movie" && qid && !["movie", "tvmovie", "short"].includes(qid)) return false;
          if (resolvedKind === "tv" && qid && !["tvseries", "tvminiseries", "tvepisode"].includes(qid)) return false;
          return true;
        });
        if (match) return embedResponse(String(match.id), resolvedKind, {
          title: String(match.l || catalogTitle), year: match.y || catalogYear,
          poster: typeof match.i?.imageUrl === "string" ? match.i.imageUrl : null,
          source: "imdb-public-suggestions",
        });
      } catch (error) {
        console.error("Streamivio public IMDb suggestions lookup failed:", error);
      }
    }
  }

  // IMDb ID discovery runs in the MAIN WEBSITE server route; no API key is required
  // for the scraper package. Only exact title matches are accepted.
  if (catalogTitle.length >= 2) {
    try {
      const match = await lookupImdbId(catalogTitle, catalogYear, resolvedKind);
      if (match) {
        return embedResponse(match.imdbId, resolvedKind, {
          title: match.title,
          year: match.year,
          poster: match.poster,
          source: "website-imdb-scraper",
        });
      }
    } catch (error) {
      console.error("Streamivio website IMDb ID lookup failed:", error);
    }
  }

  // Optional fallback to the Streamivio metadata service for exact title/year matching.
  const metadataBase = (
    process.env.PYMOVIEDB_SERVICE_URL
    || process.env.PYMOVIEDB_API_URL
    || ""
  ).replace(/\/+$/, "");

  if (metadataBase && catalogTitle.length >= 2) {
    try {
      const resolveUrl = new URL("/resolve", metadataBase);
      resolveUrl.searchParams.set("title", catalogTitle);
      if (catalogYear) resolveUrl.searchParams.set("year", catalogYear);
      resolveUrl.searchParams.set("type", resolvedKind);

      const response = await fetch(resolveUrl.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(5500),
      });

      if (response.ok) {
        const data = await response.json();
        if (isImdbId(data?.imdb_id)) {
          return embedResponse(data.imdb_id, resolvedKind, {
            title: data.title || catalogTitle,
            poster: data.poster_url || null,
            source: "streamivio-metadata-resolver",
          });
        }
      }
    } catch (error) {
      console.error("Streamivio metadata resolver unavailable:", error);
    }
  }

  return NextResponse.json(
    {
      available: false,
      message: "The IMDb lookup could not verify this exact title. Check the title and release year, or add its verified IMDb ID to the catalog.",
      debug: process.env.NODE_ENV === "development" ? "IMDb providers returned no verified exact title match." : undefined,
    },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
