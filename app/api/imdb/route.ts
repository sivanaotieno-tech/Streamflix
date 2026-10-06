import {NextRequest, NextResponse} from "next/server";

const IMDB_ID_PATTERN = /^tt\d+$/;

export async function GET(request: NextRequest) {
  const serviceUrl = process.env.PYMOVIEDB_API_URL?.replace(/\/+$/, "");
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const imdbId = request.nextUrl.searchParams.get("id")?.trim();
  const titleType = request.nextUrl.searchParams.get("type")?.trim() || "movie";
  const popularType = request.nextUrl.searchParams.get("popular")?.trim();
  const genre = request.nextUrl.searchParams.get("genre")?.trim();

  if (!serviceUrl) {
    return NextResponse.json(
      {error: "PyMovieDb service is not configured"},
      {status: 503}
    );
  }

  if (!["movie", "tv"].includes(titleType)) {
    return NextResponse.json({error: "Type must be movie or tv"}, {status: 400});
  }

  if (popularType && !["movie", "tv"].includes(popularType)) {
    return NextResponse.json({error: "Popular type must be movie or tv"}, {status: 400});
  }

  if (popularType && (query || imdbId)) {
    return NextResponse.json(
      {error: "Popular titles cannot be combined with a query or IMDb ID"},
      {status: 400}
    );
  }

  if (genre && !/^[a-z_]+$/.test(genre)) {
    return NextResponse.json({error: "Invalid genre"}, {status: 400});
  }

  if (query && imdbId) {
    return NextResponse.json(
      {error: "Provide either a search query or an IMDb ID"},
      {status: 400}
    );
  }

  if (imdbId && !IMDB_ID_PATTERN.test(imdbId)) {
    return NextResponse.json({error: "Invalid IMDb ID"}, {status: 400});
  }

  if (!query && !imdbId && !popularType) {
    return NextResponse.json(
      {error: "A search query or IMDb ID is required"},
      {status: 400}
    );
  }

  if (query && (query.length < 2 || query.length > 100)) {
    return NextResponse.json(
      {error: "Search query must be between 2 and 100 characters"},
      {status: 400}
    );
  }

  const params = new URLSearchParams();
  let path: string;
  if (imdbId) {
    path = "/title";
    params.set("id", imdbId);
  } else if (popularType) {
    path = "/popular";
    params.set("type", popularType);
    if (genre) params.set("genre", genre);
  } else {
    path = "/search";
    params.set("q", query ?? "");
    params.set("type", titleType);
  }
  const endpoint = `${serviceUrl}${path}?${params}`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000)
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        data,
        {status: response.status}
      );
    }
    return NextResponse.json(data, {status: 200});
  } catch (error) {
    console.error("PyMovieDb metadata request failed", error);
    return NextResponse.json(
      {error: "PyMovieDb metadata service is unavailable"},
      {status: 502}
    );
  }
}
