import {NextRequest, NextResponse} from "next/server";

const IMDB_ID_PATTERN = /^tt\d+$/;
const ARCHIVED_IMDB_API = "https://imdb-api.projects.thetuhin.com";

function getMetadataServiceUrl() {
  const value = process.env.PYMOVIEDB_SERVICE_URL || process.env.PYMOVIEDB_API_URL;
  return value?.replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const serviceUrl = getMetadataServiceUrl();
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim();
  const imdbId = params.get("id")?.trim();
  const titleType = params.get("type")?.trim() || "movie";
  const popularType = params.get("popular")?.trim();
  const genre = params.get("genre")?.trim();
  const action = params.get("action")?.trim();
  const season = params.get("season")?.trim();
  const option = params.get("option")?.trim() || "date";
  const sortOrder = params.get("sortOrder")?.trim() === "asc" ? "asc" : "desc";

  if (action && ["reviews", "season"].includes(action)) {
    if (!imdbId || !IMDB_ID_PATTERN.test(imdbId)) return NextResponse.json({error:"Valid IMDb ID required"}, {status:400});
    let path = "";
    if (action === "reviews") {
      path = "/reviews/" + encodeURIComponent(imdbId) + "?option=" + encodeURIComponent(["helpfulness","date","votes","rating"].includes(option) ? option : "date") + "&sortOrder=" + sortOrder;
    } else {
      if (!season || !/^\d+$/.test(season)) return NextResponse.json({error:"Season number required"}, {status:400});
      path = "/title/" + encodeURIComponent(imdbId) + "/season/" + encodeURIComponent(season);
    }
    try {
      const response = await fetch(ARCHIVED_IMDB_API + path, {headers:{Accept:"application/json"}, cache:"no-store", signal:AbortSignal.timeout(8000)});
      if (!response.ok) return NextResponse.json({available:false,error:"IMDb service returned "+response.status},{status:502});
      return NextResponse.json({available:true,provider:"tuhinpal/imdb-api",data:await response.json()});
    } catch {
      return NextResponse.json({available:false,error:"Archived IMDb service is unavailable"},{status:503});
    }
  }

  if (!["movie", "tv"].includes(titleType)) return NextResponse.json({error: "Type must be movie or tv"}, {status:400});
  if (popularType && !["movie", "tv"].includes(popularType)) return NextResponse.json({error: "Popular type must be movie or tv"}, {status:400});
  if (popularType && (query || imdbId)) return NextResponse.json({error: "Popular titles cannot be combined with a query or IMDb ID"}, {status:400});
  if (genre && !/^[a-z_]+$/.test(genre)) return NextResponse.json({error: "Invalid genre"}, {status:400});
  if (query && imdbId) return NextResponse.json({error: "Provide either a search query or IMDb ID"}, {status:400});
  if (imdbId && !IMDB_ID_PATTERN.test(imdbId)) return NextResponse.json({error: "Invalid IMDb ID"}, {status:400});
  if (!query && !imdbId && !popularType) return NextResponse.json({error: "A search query or IMDb ID is required"}, {status:400});
  if (query && (query.length < 2 || query.length > 100)) return NextResponse.json({error: "Search query must be between 2 and 100 characters"}, {status:400});

  let path: string;
  const searchParams = new URLSearchParams();
  if (imdbId) { path = "title"; searchParams.set("id", imdbId); }
  else if (popularType) { path = "popular"; searchParams.set("type", popularType); if (genre) searchParams.set("genre", genre); }
  else { path = "search"; searchParams.set("q", query ?? ""); searchParams.set("type", titleType); }

  if (serviceUrl) {
    const endpoint = new URL(`${path}?${searchParams.toString()}`, `${serviceUrl}/`);
    try {
      const response = await fetch(endpoint, {cache:"no-store", signal:AbortSignal.timeout(10_000)});
      const data: unknown = await response.json();
      if (response.ok) return NextResponse.json(data, {status:200});
    } catch (error) { console.warn("Primary Streamivio metadata service unavailable",error); }
  }

  if (!popularType) {
    try {
      const fallbackPath = imdbId ? "/title/" + encodeURIComponent(imdbId) : "/search?query=" + encodeURIComponent(query ?? "");
      const response = await fetch(ARCHIVED_IMDB_API + fallbackPath, {headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
      if (response.ok) return NextResponse.json({available:true,provider:"tuhinpal/imdb-api",data:await response.json()},{status:200});
    } catch (error) { console.warn("Archived IMDb fallback unavailable",error); }
  }
  return NextResponse.json({error:"Metadata services are unavailable"},{status:503});
}
