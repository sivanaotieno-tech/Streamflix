import { NextRequest, NextResponse } from "next/server";
import { catalog } from "../../data/catalog";
import { gamesCatalog } from "../../data/games";

type AnyRecord = Record<string, any>;
const NO_STORE = { "Cache-Control": "no-store" };

const normalize = (value: unknown) =>
  String(value ?? "").replace(/\s*\(\d{4}\)\s*$/, "").normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const firstText = (row: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const firstNumber = (row: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const raw = row?.[key];
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw.trim()) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
};

const textArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => typeof entry === "string" ? entry.trim() : firstText(entry as AnyRecord, ["name", "title"])).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return value.split(/[,|]/).map((entry) => entry.trim()).filter(Boolean);
  return [];
};

const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function projectDetails(base: AnyRecord, metadata?: AnyRecord | null) {
  const source = metadata ?? {};
  const title = base.title || base.name || firstText(source, ["title", "name", "titleText"]) || "";
  const overview = firstText(source, ["overview", "description", "plot", "synopsis", "plotOutline", "storyline"]) ||
    base.overview || base.description || "";
  const poster = firstText(source, ["poster_url", "poster", "image", "imageUrl", "primaryImage"]) ||
    base.poster_url || base.poster || null;
  const genres = textArray(source.genres ?? source.genre).length ? textArray(source.genres ?? source.genre) : (base.genres ?? []);
  const country = textArray(source.country ?? source.countries).length ? textArray(source.country ?? source.countries) : (base.country ?? []);
  const directors = textArray(source.directors ?? source.director);
  const cast = textArray(source.cast ?? source.stars ?? source.actorList ?? source.actors ?? source.actor);
  const ratingSource = isRecord(source.rating) ? { ...source, rating: source.rating.ratingValue } : source;
  const rating = firstNumber(ratingSource, ["rating", "imdb_rating", "imDbRating", "imdbRating", "userRating", "ratingValue"]) ?? base.rating;
  const rawYear = firstText(source, ["year", "release_year", "datePublished", "date_published", "releaseDate", "release_date"]);
  const year = rawYear.match(/\d{4}/)?.[0] || base.year || "";
  const contentRating = firstText(source, ["contentRating", "age_rating", "rated", "certificate"]) || base.contentRating || base.ageRating || null;
  const runtime = firstText(source, ["runtime", "runtimeStr", "duration", "length"]) || base.runtime || null;
  const sourceId = firstText(source, ["id"]);
  const imdbId = firstText(source, ["imdbID", "imdb_id", "imdbId"]) ||
    (/^tt\d+$/i.test(sourceId) ? sourceId : "") ||
    base.imdbID || base.imdb_id || base.imdbId || null;
  const tmdbId = firstText(source, ["tmdb_id", "tmdbId", "tmdbID"]) ||
    (/^\d{1,12}$/.test(sourceId) ? sourceId : "") ||
    base.tmdb_id || base.tmdbId || null;

  return {
    ...base,
    id: base.id ?? source.id ?? imdbId ?? tmdbId ?? title,
    title,
    name: title,
    overview,
    description: overview,
    year,
    rating,
    type: base.type || source.type || source.contentType || "movie",
    genres,
    country,
    poster,
    poster_url: poster,
    contentRating,
    ageRating: contentRating,
    runtime,
    directors: directors.length ? directors : (base.directors ?? []),
    cast: cast.length ? cast : (base.cast ?? []),
    imdbId,
    imdb_id: imdbId,
    tmdbId,
    tmdb_id: tmdbId,
    source: firstText(source, ["source"]) || (metadata ? "IMDb metadata + Streamivio catalog" : (base.source || "Streamivio Library")),
    playback_available: Boolean(base.playback_available ?? base.video_url),
  };
}

async function serviceGet(base: string, path: string): Promise<AnyRecord | null> {
  try {
    const url = new URL(path, base);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isRecord(payload) ? payload : null;
  } catch (error) {
    console.error("Streamivio title metadata service is unavailable", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = (params.get("id") || "").trim().slice(0, 128);
  const titleQuery = (params.get("title") || "").trim().slice(0, 100);
  const suppliedTypeParam = params.get("type");
  const suppliedType = (suppliedTypeParam || "movie").trim().toLowerCase();
  const imdbId = (params.get("imdb_id") || params.get("imdbId") || "").trim();
  const tmdbId = (params.get("tmdb_id") || params.get("tmdbId") || "").trim();

  if (!id && titleQuery.length < 2 && !/^tt\d+$/i.test(imdbId)) {
    return NextResponse.json({
      available: false,
      error: "Provide a catalog title ID, an IMDb ID, or a title with at least two characters.",
      message: "A TMDB ID can be included alongside a title, but the metadata service needs a name or IMDb ID to retrieve descriptive details.",
    }, { status: 400, headers: NO_STORE });
  }

  const local = catalog.find((item) => String(item.id) === id) ??
    catalog.find((item) => normalize(item.title) === normalize(titleQuery) &&
      (suppliedType === "all" || item.type === suppliedType || (suppliedType === "tv" && ["anime", "documentary", "kids", "reality"].includes(item.type)))) ?? null;
  const game: AnyRecord | null = (gamesCatalog as unknown as AnyRecord[]).find((item) => String(item.id) === id) ??
    (gamesCatalog as unknown as AnyRecord[]).find((item) => normalize(item.title) === normalize(titleQuery)) ?? null;

  const baseTitle: AnyRecord = local ? {
    ...local,
    description: local.overview,
    poster_url: local.poster,
    age_rating: local.ageRating,
  } : game ? {
    id: game.id,
    title: game.title,
    name: game.title,
    overview: game.overview,
    description: game.overview,
    year: game.year,
    genres: game.genres,
    country: [],
    source: "Local Games Catalog",
    type: "game",
    platforms: game.platforms,
    developer: game.developer,
    publisher: game.publisher,
    contentRating: game.ageRating,
    ageRating: game.ageRating,
    poster: null,
    poster_url: null,
    playback_available: false,
  } : {
    id: id || imdbId || tmdbId || undefined,
    title: titleQuery,
    name: titleQuery,
    type: suppliedTypeParam ? suppliedType : undefined,
    overview: "",
    description: "",
    genres: [],
    country: [],
    source: "Metadata lookup",
    playback_available: false,
  };

  const serviceBase = (process.env.PYMOVIEDB_SERVICE_URL || process.env.PYMOVIEDB_API_URL || "").replace(/\/+$/, "");
  let metadata: AnyRecord | null = null;
  let resolvedProviderId = /^tt\d+$/i.test(imdbId) ? imdbId : /^tt\d+$/i.test(id) ? id : "";
  const kind = ["tv", "anime", "documentary", "documentaries", "kids", "reality", "tvshow", "series"].includes(suppliedType) ||
    ["tv", "anime", "documentary", "kids", "reality"].includes(String(local?.type || ""))
    ? "tv" : "movie";

  if (serviceBase && !game) {
    if (resolvedProviderId) {
      metadata = await serviceGet(serviceBase, "/title?id=" + encodeURIComponent(resolvedProviderId));
    } else if (id && !local) {
      // The Python catalog can contain titles that are not in the frontend fallback list.
      // Resolve the catalog ID there before trying external metadata search.
      const catalogRecord = await serviceGet(serviceBase, "/title?id=" + encodeURIComponent(id));
      if (catalogRecord && firstText(catalogRecord, ["title", "name"])) metadata = catalogRecord;
    }

    const searchTitle = titleQuery || String(local?.title || game?.title || "");
    if (!metadata && searchTitle.length >= 2) {
      const searchPath = "/search?q=" + encodeURIComponent(searchTitle) + "&type=" + encodeURIComponent(kind);
      const payload = await serviceGet(serviceBase, searchPath);
      const candidates: AnyRecord[] = Array.isArray(payload?.results) ? payload.results.filter((row: unknown): row is AnyRecord => isRecord(row)) : [];
      const exact = candidates.find((row) => normalize(firstText(row, ["title", "name", "titleText"])) === normalize(searchTitle));
      if (exact) {
        metadata = exact;
        const externalId = firstText(exact, ["imdbID", "imdb_id", "imdbId", "id"]);
        if (/^tt\d+$/i.test(externalId)) {
          resolvedProviderId = externalId;
          metadata = await serviceGet(serviceBase, "/title?id=" + encodeURIComponent(externalId)) ?? exact;
        }
      }
    }
  }

  if (!local && !game && !metadata && !resolvedProviderId) {
    return NextResponse.json({
      available: false,
      error: "No matching title was found.",
      message: "Check the spelling or try a different title. Some external metadata sources may be temporarily unavailable.",
    }, { status: 404, headers: NO_STORE });
  }

  const detail = projectDetails(baseTitle, metadata);
  return NextResponse.json({
    available: true,
    metadata_available: Boolean(metadata),
    title: detail,
    message: metadata
      ? "Title details loaded."
      : "Showing Streamivio catalog details. Additional credits and metadata are not available for this title yet.",
  }, { status: 200, headers: NO_STORE });
}
