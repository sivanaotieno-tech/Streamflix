"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Play, Tv, Film, LoaderCircle, ArrowLeft, ArrowRight } from "lucide-react";

type Title = {
  id: string | number;
  title?: string;
  name?: string;
  overview?: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: string;
  rating?: number;
  type?: string;
  media_type?: string;
  imdbId?: string;
  imdb_id?: string;
  imdbID?: string;
};

const titleName = (item: Title) => item.title || item.name || "Untitled";
const titleHref = (item: Title) => {
  const raw = String(item.imdbId || item.imdb_id || item.imdbID || item.id);
  const id = raw.startsWith("imdb-") ? raw.slice(5) : raw;
  const type = String(item.type || item.media_type || "").toLowerCase();
  const isSeries = ["tv", "series", "anime", "documentary", "kids", "reality"].includes(type);
  return (isSeries ? "/tv-show/" : "/movie/") + encodeURIComponent(id);
};

export default function StreamivioTVPage() {
  const router = useRouter();
  const [items, setItems] = useState<Title[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Title | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ scope: "all", limit: "36" });
      if (search.trim()) params.set("q", search.trim());
      else params.set("popular", "1");
      const response = await fetch("/api/search?" + params.toString(), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The catalogue could not be loaded.");
      setItems(Array.isArray(payload.results) ? payload.results : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Streamivio.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const first = gridRef.current?.querySelector<HTMLElement>("[data-tv-card]");
    first?.focus();
  }, [items]);

  const openTitle = (item: Title) => router.push(titleHref(item));

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const current = document.activeElement as HTMLElement | null;
    if (!current?.hasAttribute("data-tv-card")) return;
    const cards = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-tv-card]") || []);
    const from = cards.indexOf(current);
    if (from < 0) return;
    const columns = Math.max(1, Math.floor((gridRef.current?.clientWidth || 1000) / 230));
    const next = event.key === "ArrowLeft" ? from - 1 : event.key === "ArrowRight" ? from + 1 : event.key === "ArrowUp" ? from - columns : from + columns;
    if (cards[next]) {
      event.preventDefault();
      cards[next].focus();
      cards[next].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  return (
    <main className="min-h-screen bg-[#070d17] text-white selection:bg-sky-400 selection:text-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#070d17]/95 px-6 py-5 backdrop-blur-xl md:px-12">
        <Link href="/" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-sky-400">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-sky-400/50 bg-[#102b45] text-sky-200"><Play className="h-5 w-5 fill-current" /></span>
          <span><strong className="block text-2xl tracking-tight">Streamivio</strong><span className="text-xs text-slate-400">TV experience</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => inputRef.current?.focus()} className="rounded-xl border border-white/15 p-3 text-slate-200 outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-sky-400" aria-label="Focus search"><Search /></button>
          <Link href="/" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-sky-400">Exit TV mode</Link>
        </div>
      </header>

      <section className="px-6 pb-8 pt-10 md:px-12 md:pt-14">
        <div className="mb-8 max-w-4xl">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-sky-300"><Tv size={17}/> Built for the big screen</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">Your entertainment.<br/><span className="text-sky-300">Bigger than ever.</span></h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">Browse Streamivio with your TV remote. Choose a title to open its existing detail page and playback experience.</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="mb-10 flex max-w-3xl gap-3">
          <label className="flex min-h-16 flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-5 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/40">
            <Search className="shrink-0 text-sky-300" />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies, shows and anime" className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-slate-500" />
          </label>
          <button type="submit" className="rounded-2xl bg-sky-400 px-7 text-lg font-extrabold text-slate-950 outline-none hover:bg-sky-300 focus-visible:ring-4 focus-visible:ring-white">Search</button>
        </form>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{query.trim() ? "Search results" : "Explore Streamivio"}</h2>
          <span className="text-sm text-slate-400">{items.length} titles</span>
        </div>

        {loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-sky-200"><LoaderCircle className="animate-spin" /> Loading your catalogue…</div> :
          error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-950/30 p-6 text-rose-100"><p>{error}</p><button onClick={() => void load(query)} className="mt-4 rounded-lg bg-white/10 px-4 py-2 font-bold focus-visible:ring-4 focus-visible:ring-sky-400">Try again</button></div> :
          items.length === 0 ? <div className="rounded-2xl border border-white/10 p-8 text-slate-300">No titles found. Try another search.</div> :
          <div ref={gridRef} onKeyDown={onGridKeyDown} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item, index) => <button key={String(item.id) + "-" + index} data-tv-card onClick={() => openTitle(item)} onFocus={() => setActive(item)} className="group min-w-0 rounded-2xl border border-white/10 bg-[#0d1726] p-2 text-left outline-none transition duration-150 hover:border-sky-300/70 hover:bg-[#12243a] focus-visible:scale-[1.035] focus-visible:border-sky-300 focus-visible:ring-4 focus-visible:ring-sky-400/70">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900">
                {item.poster ? <img src={item.poster} alt="" loading={index < 12 ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-300 group-focus-visible:scale-105" /> : <div className="grid h-full place-items-center text-slate-600"><Film size={42}/></div>}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
                <span className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-sm font-bold"><Play size={15} className="fill-current text-sky-300"/>{item.year || "Explore"}</span>
              </div>
              <div className="px-2 pb-2 pt-3">
                <h3 className="line-clamp-2 min-h-12 text-base font-bold">{titleName(item)}</h3>
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{item.type || item.media_type || "Title"}{item.rating ? " · ★ " + item.rating.toFixed(1) : ""}</p>
              </div>
            </button>)}
          </div>
        }
        {active && <p className="mt-6 text-sm text-slate-400">Selected: <strong className="text-white">{titleName(active)}</strong> · Press OK / Enter to open.</p>}
      </section>
      <footer className="flex items-center justify-between border-t border-white/10 px-6 py-6 text-xs text-slate-500 md:px-12"><span>© {new Date().getFullYear()} Streamivio</span><span className="flex items-center gap-2"><ArrowLeft size={14}/> <ArrowRight size={14}/> Use your remote to browse</span></footer>
    </main>
  );
}
