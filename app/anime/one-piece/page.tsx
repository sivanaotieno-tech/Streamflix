import Link from "next/link";

export const revalidate = 1800;

const ONE_PACE_WATCH_URL = "https://onepace.net/en/watch";
const ONE_PACE_RELEASES_URL = "https://onepace.net/en/releases";
const ONE_PACE_RSS_URL = "https://onepace.net/en/releases/rss.xml";

const FALLBACK_ARCS = [
  "Romance Dawn", "Orange Town", "Syrup Village", "Gaimon", "Baratie",
  "Arlong Park", "The Adventures of Buggy's Crew", "Loguetown",
  "Reverse Mountain", "Whisky Peak", "The Trials of Koby-Meppo",
  "Little Garden", "Drum Island", "Alabasta", "Jaya", "Skypiea",
  "Long Ring Long Land", "Water Seven", "Enies Lobby", "Post-Enies Lobby",
  "Thriller Bark", "Sabaody Archipelago", "Amazon Lily", "Impel Down",
  "The Straw Hats' Adventures", "Marineford", "Post-War",
  "Return to Sabaody", "Fishman Island", "Punk Hazard", "Dressrosa",
  "Zou", "Whole Cake Island", "Reverie", "Wano", "Egghead",
];

type StreamLink = { label: string; url: string };
type Arc = { title: string; streams: StreamLink[] };
type Release = { title: string; date: string; url: string };

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

function plainText(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

async function getOfficialArcs(): Promise<Arc[]> {
  try {
    const response = await fetch(ONE_PACE_WATCH_URL, {
      headers: { Accept: "text/html" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return [];
    const html = await response.text();
    const sections = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)];
    return sections.flatMap((section) => {
      const title = plainText(section[1]);
      if (!title || /^watch$/i.test(title)) return [];
      const body = section[2];
      const streams = [...body.matchAll(/<a\b[^>]*href=["'](https?:\/\/(?:www\.)?pixeldrain\.(?:net|com)\/l\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .flatMap((match) => {
          try {
            const url = new URL(decodeHtml(match[1]));
            if (url.protocol !== "https:" || !/(^|\.)pixeldrain\.(net|com)$/i.test(url.hostname) || !url.pathname.startsWith("/l/")) return [];
            return [{ label: plainText(match[2]) || "Watch stream", url: url.toString() }];
          } catch {
            return [];
          }
        });
      return [{ title, streams }];
    });
  } catch {
    return [];
  }
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? plainText(match[1]) : "";
}

async function getLatestReleases(): Promise<Release[]> {
  try {
    const response = await fetch(ONE_PACE_RSS_URL, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
    const atomBlocks = blocks.length ? blocks : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
    return atomBlocks.slice(0, 8).flatMap((block) => {
      const title = readTag(block, "title");
      const date = readTag(block, "pubDate") || readTag(block, "updated") || readTag(block, "published");
      const linkText = readTag(block, "link");
      const atomLink = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";
      const rawUrl = atomLink || linkText || ONE_PACE_RELEASES_URL;
      try {
        const parsed = new URL(rawUrl, ONE_PACE_RELEASES_URL);
        if (parsed.protocol !== "https:" || parsed.hostname !== "onepace.net" || !title) return [];
        return [{ title, date, url: parsed.toString() }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function getLocalHubUrl() {
  const raw = process.env.NEXT_PUBLIC_ONE_PACE_HUB_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function OnePiecePage() {
  const [officialArcs, releases] = await Promise.all([getOfficialArcs(), getLatestReleases()]);
  const localHubUrl = getLocalHubUrl();
  const arcs = officialArcs.length ? officialArcs : FALLBACK_ARCS.map((title) => ({ title, streams: [] }));

  return (
    <main className="min-h-screen bg-[#101014] px-4 py-6 text-white sm:px-8 md:px-12">
      <nav className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-[-.06em] text-[#e50914] sm:text-2xl">STREAMIVIO</Link>
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">Back to browse</Link>
      </nav>

      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2b1716] via-[#17151b] to-[#101014] p-7 sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-amber-300">One Piece · Manga-paced edition</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">ONE PACE</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Follow the Straw Hats in the fan-edited version that trims anime-only padding and follows the manga more closely.
            This page reads the arc and stream links from the One Pace project's own Watch page, so new availability can appear without copying its video files.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={ONE_PACE_WATCH_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#e50914] px-5 py-3 text-sm font-bold hover:bg-red-700">Official One Pace Watch page</a>
            <a href={ONE_PACE_RELEASES_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10">All releases</a>
            {localHubUrl && <a href={localHubUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-amber-300/40 px-5 py-3 text-sm font-bold text-amber-200 hover:bg-amber-300/10">Open my One Pace library</a>}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Stream buttons open the project's own Pixeldrain links. Language, dub, and quality options vary by arc.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Grand Line route</p>
                <h2 className="mt-1 text-2xl font-bold">Watch by arc</h2>
              </div>
              <span className="text-xs text-zinc-500">{arcs.length} arcs</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {arcs.map((arc, index) => (
                <article key={arc.title} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="min-w-0 flex-1 text-sm font-semibold">{arc.title}</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {arc.streams.length ? arc.streams.map((stream) => (
                      <a key={stream.url} href={stream.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-amber-300/30 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10">{stream.label}</a>
                    )) : (
                      <a href={ONE_PACE_WATCH_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-200 hover:text-white">Open official arc streams ↗</a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Latest from the project</p>
              <h2 className="mt-1 text-xl font-bold">Recent releases</h2>
              {releases.length ? (
                <ul className="mt-4 divide-y divide-white/10">
                  {releases.map((release) => (
                    <li key={release.url + release.title} className="py-3 first:pt-0 last:pb-0">
                      <a href={release.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:text-amber-200">{release.title}</a>
                      {release.date && <p className="mt-1 text-xs text-zinc-500">{release.date}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-400">The live release feed is temporarily unavailable. The official release archive is still available below.</p>
              )}
              <a href={ONE_PACE_RELEASES_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-bold text-amber-200 hover:text-white">Browse the full release archive ↗</a>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Storage-friendly setup</p>
              <h2 className="mt-1 text-xl font-bold">No giant download required</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Use the project's hosted streams now. For a private in-site player later, connect a separate One Pace Hub on your Windows PC and keep only the episodes you choose locally; Vercel should host the catalogue and interface, not the video files.
              </p>
              {!localHubUrl && <p className="mt-3 text-xs text-zinc-500">A private library connection can be added with the NEXT_PUBLIC_ONE_PACE_HUB_URL environment variable once that server is running.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
