import { NextRequest, NextResponse } from "next/server";
import { catalog } from "../../data/catalog";
import { gamesCatalog } from "../../data/games";

type AnyRecord = Record<string, any>;
const NO_STORE = { "Cache-Control": "no-store" };

const normalize = (value: unknown) =>
  String(value ?? "").normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

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
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(/[^0-9.]/g, "")) : NaN;
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
  const title = firstText(source, ["title", "name", "titleText"]) || base.title || base.name || "";
  const overview = firstText(source, ["overview", "description", "plot", "synopsis", "plotOutline", "storyline"]) ||
    base.overview || base.description || "";
  const poster = firstText(source, ["poster_url", "poster", "image", "imageUrl", "primaryImage"]) ||
    base.poster_url || base.poster || null;
  const genres = textArray(source.genres ?? source.genre).length ? textArray(source.genres ?? source.genre) : (base.genres ?? []);
  const country = textArray(source.country ?? source.countries).length ? textArray(source.country ?? source.countries) : (base.country ?? []);
  const directors = textArray(source.directors ?? source.director);
  const cast = textArray(source.cast ?? source.stars ?? source.actorList ?? source.actors);
  const rating = firstNumber(source, ["rating", "imdb_rating", "imDbRating", "imdbRating", "userRating"]) ?? base.rating;
  const year = firstText(source, ["year", "release_year", "releaseDate", "release_date"]) || base.year || "";
  const contentRating = firstText(source, ["contentRating", "age_rating", "rated", "certificate"]) || base.contentRating || base.ageRating || null;
  const runtime = firstText(source, ["runtime", "runtimeStr", "duration", "length"]) || base.runtime || null;
  const imdbId = firstText(source, ["imdbID", "imdb_id", "imdbId"]) || base.imdbID || base.imdb_id || base.imdbId || null;
  const tmdbId = firstText(source, ["tmdb_id", "tmdbId", "tmdbID"]) || base.tmdb_id || base.tmdbId || null;

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
    source: metadata ? "IMDb metadata + Streamivio catalog" : (base.source || "Streamivio Library"),
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
  const suppliedType = (params.get("type") || "movie").trim().toLowerCase();
  const imdbId = (params.get("imdb_id") || params.get("imdbId") || "").trim();
  const tmdbId = (params.get("tmdb_id") || params.get("tmdbId") || "").trim();

  if (!id && titleQuery.length < 2 && !/^tt\d+$/i.test(imdbId) && !/^\d{1,12}$/.test(tmdbId)) {
    return NextResponse.json({
      available: false,
      error: "Provide a catalog ID, an IMDb/TMDB ID, or a title with at least two characters.",
      message: "Choose a title from Streamivio or search by its exact name.",
    }, { status: 400, headers: NO_STORE });
  }

  const local = catalog.find((item) => String(item.id) === id) ??
    catalog.find((item) => normalize(item.title) === normalize(titleQuery) &&
      (suppliedType === "all" || item.type === suppliedType || (suppliedType === "tv" && ["anime", "documentary", "kids", "reality"].includes(item.type)))) ?? null;
  const game = gamesCatalog.find((item) => String(item.id) === id) ??
    gamesCatalog.find((item) => normalize(item.title) === normalize(titleQuery)) ?? null;

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
    type: suppliedType,
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
    } else if (/^\d{1,12}$/.test(tmdbId)) {
      // The metadata service currently supports IMDb IDs only. Preserve the TMDB ID for the player,
      // while searching by the title for available descriptive metadata.
      metadata = null;
    }

    const searchTitle = titleQuery || String(local?.title || "");
    if (!metadata && searchTitle.length >= 2) {
      const search = new URL("/search", serviceBase);
      search.searchParams.set("q", searchTitle);
      search.searchParams.set("type", kind);
      const payload = await serviceGet(serviceBase, search.pathname + search.search);
      const candidates = Array.isArray(payload?.results) ? payload.results.filter(isRecord) : [];
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
