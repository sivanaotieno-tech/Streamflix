import {NextRequest, NextResponse} from "next/server";

const IMDB_ID_PATTERN = /^tt\d+$/;

export async function GET(request: NextRequest) {
  const serviceUrl = process.env.PYMOVIEDB_API_URL?.replace(/\/+$/, "");
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const imdbId = request.nextUrl.searchParams.get("id")?.trim();

  if (!serviceUrl) {
    return NextResponse.json(
      {error: "PyMovieDb service is not configured"},
      {status: 503}
    );
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

  if (!query && !imdbId) {
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

  const endpoint = imdbId
    ? `${serviceUrl}/title?id=${encodeURIComponent(imdbId)}`
    : `${serviceUrl}/search?q=${encodeURIComponent(query ?? "")}`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000)
    });
    const data: unknown = await response.json();
    return NextResponse.json(data, {status: response.status});
  } catch (error) {
    console.error("PyMovieDb metadata request failed", error);
    return NextResponse.json(
      {error: "PyMovieDb metadata service is unavailable"},
      {status: 502}
    );
  }
}
