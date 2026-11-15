"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Github, Search, Sparkles } from "lucide-react";

type RemoteManga = {
  title?: string;
  slug?: string;
  cover?: string;
  synopsis?: string;
  genres?: string[];
  langs?: string[];
  chapters?: number;
  volumes?: number;
  rating?: number;
  chapter?: number;
};
type ApiResponse = { data?: RemoteManga[]; count?: number; detail?: string };

const featuredTitles = [
  { title: "One Piece", year: "1997", description: "The Straw Hat crew sail in search of the world's greatest treasure.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Jujutsu Kaisen", year: "2018", description: "A student enters the dangerous world of curses and sorcerers.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Chainsaw Man", year: "2018", description: "Denji's life changes after he bonds with the chainsaw devil, Pochita.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Demon Slayer", year: "2016", description: "Tanjiro fights demons while searching for a way to save his sister.", href: "https://www.viz.com/demon-slayer-kimetsu-no-yaiba" },
  { title: "Spy x Family", year: "2019", description: "A spy, an assassin and a telepath build a family full of secrets.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Sakamoto Days", year: "2020", description: "A retired hitman protects his peaceful family and shop.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Kaiju No. 8", year: "2020", description: "A cleanup worker gains the power to become the monsters he once fought.", href: "https://mangaplus.shueisha.co.jp/" },
  { title: "Blue Lock", year: "2018", description: "Strikers compete to become Japan's ultimate forward.", href: "https://kmanga.kodansha.com/" },
  { title: "Frieren: Beyond Journey's End", year: "2020", description: "An elven mage reflects on friendship and the passage of time.", href: "https://www.viz.com/frieren-beyond-journeys-end" },
  { title: "Berserk", year: "1989", description: "A dark fantasy epic following Guts. Mature themes.", href: "https://www.darkhorse.com/" },
  { title: "Vagabond", year: "1998", description: "A historical samurai epic inspired by Miyamoto Musashi.", href: "https://www.viz.com/vagabond" },
  { title: "My Hero Academia", year: "2014", description: "A powerless boy pursues his dream of becoming a hero.", href: "https://www.viz.com/my-hero-academia" },
];

const sources = [
  ["anime-and-manga/lists", "Open title lists and ID mappings.", "https://github.com/anime-and-manga/lists"],
  ["opentomedb/opentome", "Volume metadata; review its non-commercial licence before commercial use.", "https://github.com/opentomedb/opentome"],
  ["kuiti/manga-source-index", "Source definitions and metadata, not chapter rights.", "https://github.com/kuiti/manga-source-index"],
  ["sekiseigumi/metachan-api", "Open-source anime and manga metadata API.", "https://github.com/sekiseigumi/metachan-api"],
  ["stabldev/mangareader-api", "Featured, trending, search and manga metadata from its MangaReader.to scraper.", "https://github.com/stabldev/mangareader-api"],
];

export default function MangaPage() {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<RemoteManga[]>([]);
  const [mode, setMode] = useState<"trending" | "featured" | "search">("trending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(type: "trending" | "featured" | "search", search = "") {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type });
      if (search) params.set("q", search);
      const response = await fetch("/api/manga/catalog?" + params.toString(), { cache: "no-store" });
      const json = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(json.detail || "Manga catalogue is temporarily unavailable.");
      setRemote(Array.isArray(json.data) ? json.data : []);
      setMode(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the manga catalogue.");
      setRemote([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("trending"); }, []);

  const local = useMemo(() => featuredTitles.filter(item => item.title.toLowerCase().includes(query.toLowerCase())), [query]);

  return <main className="min-h-screen bg-[#090b10] px-5 pb-20 pt-8 text-white md:px-12">
    <div className="mx-auto max-w-7xl">
      <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/> Back to Streamivio</a>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.28em] text-sky-300"><BookOpen size={15}/> Streamivio Manga</div><h1 className="text-4xl font-black tracking-tight md:text-6xl">Read beyond the screen.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Discover manga, manhwa and original stories. Catalogue metadata is supplied by the connected API; reading availability and rights remain with publishers and creators.</p></div>
        <label className="flex w-full max-w-sm items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3"><Search size={16} className="text-zinc-500"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&query.trim()) void load("search",query.trim());}} placeholder="Search the library..." className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"/><button onClick={()=>query.trim()?void load("search",query.trim()):void load("trending")} className="text-xs font-semibold text-sky-300">Search</button></label>
      </div>

      <section className="mb-12 rounded-3xl border border-rose-400/20 bg-gradient-to-br from-rose-950/40 to-zinc-950 p-6 md:p-9">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.25em] text-rose-300"><Sparkles size={15}/> Streamivio Original · In development</div>
        <h2 className="mb-3 text-3xl font-black md:text-5xl">BAN KAISEN</h2>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">An original manga project. Volume 1 is <strong>Whispers from The Heart</strong>; Chapter 1 is <strong>The White Van</strong>. The complete saga roadmap is being developed, with Divine Arc excluded from canon.</p>
        <div className="mt-5 flex flex-wrap gap-3"><a href="/manga/ban-kaisen" className="rounded-full bg-rose-400 px-5 py-3 text-sm font-bold text-black hover:bg-rose-300">Open BAN KAISEN reader</a><a href="/manga/ban-kaisen#arc-guide" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10">Explore the arc guide</a></div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">The reader UI and roadmap are not a claim that all chapters or illustrations have been completed. Each chapter becomes published only after its manuscript, artwork and lettering are finished.</p>
      </section>

      <section className="mb-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Manga discovery</h2><p className="mt-1 text-xs text-zinc-500">Live results from the MangaReader API</p></div><div className="flex gap-2"><button onClick={()=>void load("trending")} className={"rounded-full px-4 py-2 text-xs font-semibold "+(mode==="trending"?"bg-sky-300 text-black":"border border-white/10 text-zinc-300")}>Trending</button><button onClick={()=>void load("featured")} className={"rounded-full px-4 py-2 text-xs font-semibold "+(mode==="featured"?"bg-sky-300 text-black":"border border-white/10 text-zinc-300")}>Featured</button></div></div>
        {loading&&<p className="py-8 text-sm text-zinc-400">Loading manga catalogue…</p>}
        {error&&<p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{error} The curated catalogue remains available below.</p>}
        {!loading&&remote.length>0&&<div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{remote.map((item,i)=><article key={item.slug||item.title||i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"><div className="aspect-[3/4] bg-zinc-900">{item.cover&&<img src={item.cover} alt={item.title||"Manga cover"} loading="lazy" className="h-full w-full object-cover"/>}</div><div className="p-4"><h3 className="font-bold">{item.title||"Untitled manga"}</h3><p className="mt-1 text-xs text-zinc-500">{item.chapters!==undefined?item.chapters+" chapters":item.chapter!==undefined?"Latest chapter "+item.chapter:""}{item.volumes!==undefined?" · "+item.volumes+" volumes":""}</p><p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-400">{item.synopsis||item.genres?.join(" · ")||"Manga catalogue entry"}</p></div></article>)}</div>}
        {!loading&&mode==="search"&&remote.length===0&&<p className="mb-6 text-sm text-zinc-500">No results returned for that search.</p>}
      </section>

      <section className="mb-14"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Curated titles</h2><span className="text-xs text-zinc-500">{local.length} titles</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{local.map(item=><article key={item.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Manga · {item.year}</p><h3 className="mt-2 text-lg font-bold">{item.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{item.description}</p><a href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">Official reading destination <ExternalLink size={12}/></a></article>)}</div></section>

      <section><div className="mb-5 flex items-center gap-2"><Github size={18}/><h2 className="text-xl font-bold">Open-source data sources</h2></div><div className="grid gap-3 md:grid-cols-2">{sources.map(([name,note,href])=><a key={name} href={href} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[.03] p-4 hover:bg-white/[.06]"><div className="flex items-center justify-between gap-3 text-sm font-semibold">{name}<ExternalLink size={14}/></div><p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p></a>)}</div><p className="mt-4 text-xs leading-5 text-zinc-500">The connected MangaReader API is a scraper for MangaReader.to and documents featured, trending, search and manga-detail endpoints. Its documented response does not guarantee chapter-page delivery. Respect source-site terms and only publish content Streamivio has permission to distribute.</p></section>
    </div>
  </main>;
}
