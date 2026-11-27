import { NextResponse } from "next/server";

const API = "https://api.mangadex.org";
const coverUrl = (id: string, filename: string) => `https://uploads.mangadex.org/covers/${id}/${filename}.256.jpg`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), "includes[]": "cover_art", "order[rating]": "desc" });
    if (q) params.set("title", q);
    const response = await fetch(`${API}/manga?${params.toString()}`, { headers: { "User-Agent": "Streamivio/1.0 (catalogue)" }, next: { revalidate: 3600 } });
    if (!response.ok) return NextResponse.json({ detail: "Manga metadata provider returned an error." }, { status: response.status });
    const json = await response.json();
    const data = (json.data || []).map((entry: any) => {
      const attributes = entry.attributes || {};
      const cover = (entry.relationships || []).find((rel: any) => rel.type === "cover_art");
      const filename = cover?.attributes?.fileName || cover?.attributes?.filename;
      const title = attributes.title?.en || Object.values(attributes.title || {})[0] || "Untitled";
      const description = attributes.description?.en || Object.values(attributes.description || {})[0] || "";
      return { title, slug: entry.id, cover: filename ? coverUrl(entry.id, filename) : null, synopsis: description, genres: (attributes.tags || []).map((tag: any) => tag.attributes?.name?.en).filter(Boolean), year: attributes.year || null, status: attributes.status || null, sourceUrl: `https://mangadex.org/title/${entry.id}` };
    });
    return NextResponse.json({ data, count: json.total || data.length });
  } catch {
    return NextResponse.json({ detail: "Catalogue temporarily unavailable. Try again later." }, { status: 502 });
  }
}
