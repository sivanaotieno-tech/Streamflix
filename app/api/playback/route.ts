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
  // The package queries IMDb title suggestions and returns metadata/IDs only.
  // It does not download, extract, or proxy video streams.
  const { Client } = await import("@myno_21/imdb-scraper");
  const client = new Client();
  const lookup = kind === "tv"
    ? client.getShowViaName(encodeURIComponent(title))
    : client.getMovieViaName(encodeURIComponent(title));

  const results = await Promise.race([
    lookup,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("IMDb lookup timed out")), 5000),
    ),
  ]);

  if (!Array.isArray(results)) return null;

  const wanted = normalizeTitle(title);
  const matches: any[] = (results as any[]).filter((item: any) => {
    const candidateTitle = String(item?.title || item?.name || "");
    if (normalizeTitle(candidateTitle) !== wanted || !isImdbId(item?.id)) return false;

    if (year) {
      const candidateYear = String(item?.year || item?.releaseYear || "").slice(0, 4);
      if (candidateYear && candidateYear !== year.slice(0, 4)) return false;
    }
    return true;
  });

  const match = matches[0];
  return match ? {
    imdbId: String(match.id),
    title: String(match.title || match.name || title),
    poster: typeof match.poster === "string" ? match.poster : null,
    year: match.year || year,
  } : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = (params.get("id") || "").trim();
  const title = (params.get("title") || "").trim();
  const requestedType = (params.get("type") || "movie").trim().toLowerCase();
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

  // Use an ID already verified and stored in the website catalog.
  const storedImdbId = (local as any)?.imdb_id || (local as any)?.imdbId;
  if (isImdbId(storedImdbId)) {
    return embedResponse(storedImdbId, resolvedKind, { title: catalogTitle, source: "website-catalog" });
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
      message: "We couldn't find a verified IMDb ID for this title. Check its title and release year, or add a verified imdb_id to the website catalog.",
    },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
