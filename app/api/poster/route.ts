import { NextRequest, NextResponse } from "next/server";

const normalizeTitle = (value: unknown) =>
  String(value ?? "")
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isTvType = (value: string) =>
  ["tv", "anime", "documentary", "documentaries", "kids", "reality", "series", "tvshow"].includes(value.toLowerCase());

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = (params.get("title") || "").trim().slice(0, 100);
  const year = (params.get("year") || "").trim().slice(0, 4);
  const type = (params.get("type") || "movie").trim().toLowerCase();
  const requestedImdbId = (params.get("imdb_id") || "").trim();

  if (title.length < 2 || !["movie", "tv", "anime", "documentary", "kids", "reality"].includes(type)) {
    return NextResponse.json({ poster: null }, { status: 400, headers: { "Cache-Control": "public, max-age=300" } });
  }

  const first = Array.from(title)[0]?.toLowerCase() || "";
  const url = "https://v2.sg.media-imdb.com/suggestion/" + encodeURIComponent(first) + "/" + encodeURIComponent(title) + ".json";

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 Streamivio/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return NextResponse.json({ poster: null }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
    }

    const payload: any = await response.json();
    const results: any[] = Array.isArray(payload?.d) ? payload.d : [];
    const wanted = normalizeTitle(title);
    const tv = isTvType(type);
    const match = results.find((item: any) => {
      if (requestedImdbId && String(item?.id || "").toLowerCase() === requestedImdbId.toLowerCase()) return true;
      if (normalizeTitle(item?.l || item?.title) !== wanted) return false;
      const qid = String(item?.qid || "").toLowerCase();
      if (tv && qid && !["tvseries", "tvminiseries"].includes(qid)) return false;
      if (!tv && qid && !["movie", "tvmovie", "short"].includes(qid)) return false;
      const candidateYear = item?.y ? String(item.y).match(/\d{4}/)?.[0] : "";
      if (year && candidateYear && candidateYear !== year) return false;
      return true;
    });

    const imageUrl = match?.i?.imageUrl;
    let poster: string | null = null;
    if (typeof imageUrl === "string") {
      try {
        const image = new URL(imageUrl);
        if (image.protocol === "https:" && (image.hostname === "m.media-amazon.com" || image.hostname.endsWith(".ssl-images-amazon.com"))) {
          poster = image.toString();
        }
      } catch {
        poster = null;
      }
    }

    return NextResponse.json(
      { poster, imdbId: typeof match?.id === "string" ? match.id : null },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error("Streamivio poster lookup failed:", error);
    return NextResponse.json({ poster: null }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
  }
}
