"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, ExternalLink, Sparkles, Github, ArrowLeft } from "lucide-react";

type Manga = { title: string; kind: string; year: string; description: string; tags: string[]; links: { label: string; href: string }[] };

const manga: Manga[] = [
  { title: "One Piece", kind: "Manga", year: "1997", description: "Monkey D. Luffy and the Straw Hat crew chase the world's greatest treasure.", tags: ["Adventure", "Pirates", "Action"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100020" }, { label: "VIZ", href: "https://www.viz.com/one-piece" }] },
  { title: "Jujutsu Kaisen", kind: "Manga", year: "2018", description: "A high-school student enters the dangerous world of curses and jujutsu sorcerers.", tags: ["Dark fantasy", "Action"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100034" }, { label: "VIZ", href: "https://www.viz.com/jujutsu-kaisen" }] },
  { title: "Chainsaw Man", kind: "Manga", year: "2018", description: "Denji's life changes after he bonds with the chainsaw devil, Pochita.", tags: ["Action", "Horror"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100037" }, { label: "VIZ", href: "https://www.viz.com/chainsaw-man" }] },
  { title: "My Hero Academia", kind: "Manga", year: "2014", description: "A powerless boy pursues his dream of becoming a hero in a superpowered world.", tags: ["Superhero", "Action"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100018" }, { label: "VIZ", href: "https://www.viz.com/my-hero-academia" }] },
  { title: "Demon Slayer: Kimetsu no Yaiba", kind: "Manga", year: "2016", description: "Tanjiro fights demons while searching for a way to save his sister.", tags: ["Fantasy", "Action"], links: [{ label: "VIZ", href: "https://www.viz.com/demon-slayer-kimetsu-no-yaiba" }] },
  { title: "Spy x Family", kind: "Manga", year: "2019", description: "A spy, an assassin and a telepath build a family full of secrets.", tags: ["Comedy", "Espionage"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100056" }, { label: "VIZ", href: "https://www.viz.com/spy-x-family" }] },
  { title: "Sakamoto Days", kind: "Manga", year: "2020", description: "A retired legendary hitman protects his peaceful family and shop.", tags: ["Action", "Comedy"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100105" }, { label: "VIZ", href: "https://www.viz.com/sakamoto-days" }] },
  { title: "Kaiju No. 8", kind: "Manga", year: "2020", description: "A cleanup worker gains the power to become the very monsters he once fought.", tags: ["Sci-fi", "Action"], links: [{ label: "MANGA Plus", href: "https://mangaplus.shueisha.co.jp/titles/100110" }, { label: "VIZ", href: "https://www.viz.com/kaiju-no-8" }] },
  { title: "Blue Lock", kind: "Manga", year: "2018", description: "Strikers compete in an intense program designed to create Japan's ultimate forward.", tags: ["Sports", "Football"], links: [{ label: "K MANGA", href: "https://kmanga.kodansha.com/" }] },
  { title: "Frieren: Beyond Journey's End", kind: "Manga", year: "2020", description: "An elven mage reflects on friendship, memory and the passage of time after the hero's journey.", tags: ["Fantasy", "Drama"], links: [{ label: "VIZ", href: "https://www.viz.com/frieren-beyond-journeys-end" }] },
  { title: "Berserk", kind: "Manga", year: "1989", description: "A dark fantasy epic following the warrior Guts. Intended for mature readers.", tags: ["Dark fantasy", "Mature"], links: [{ label: "Dark Horse", href: "https://www.darkhorse.com/Books/3005-120/Berserk-Deluxe-Edition-Volume-1-HC" }] },
  { title: "Vagabond", kind: "Manga", year: "1998", description: "A historical samurai epic inspired by the life of Miyamoto Musashi.", tags: ["Historical", "Drama"], links: [{ label: "VIZ", href: "https://www.viz.com/vagabond" }] }
];

const githubSources = [
  { name: "anime-and-manga/lists", note: "Open JSON ID mappings and title lists for anime and manga.", href: "https://github.com/anime-and-manga/lists" },
  { name: "opentomedb/opentome", note: "Open manga and light-novel volume metadata. Data has a non-commercial licence; review its terms before using it commercially.", href: "https://github.com/opentomedb/opentome" },
  { name: "kuiti/manga-source-index", note: "An index of manga-source definitions from open-source reader projects; it contains source metadata, not manga chapters.", href: "https://github.com/kuiti/manga-source-index" },
  { name: "sekiseigumi/metachan-api", note: "An open-source anime and manga metadata API project; self-hosting and maintenance are required.", href: "https://github.com/sekiseigumi/metachan-api" }
];

export default function MangaPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => manga.filter(item => (item.title + " " + item.tags.join(" ")).toLowerCase().includes(query.toLowerCase())), [query]);
  return <main className="min-h-screen bg-[#090b10] px-5 pb-20 pt-8 text-white md:px-12">
    <div className="mx-auto max-w-7xl">
      <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/> Back to Streamivio</a>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.28em] text-sky-300"><BookOpen size={15}/> Streamivio Manga</div><h1 className="text-4xl font-black tracking-tight md:text-6xl">Read beyond the screen.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Discover manga, manhwa and original stories. Streamivio links to official reading destinations; availability and regional access are controlled by each publisher.</p></div>
        <label className="flex w-full max-w-sm items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3"><Search size={16} className="text-zinc-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search manga..." className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"/></label>
      </div>
      <section className="mb-14">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Manga library</h2><span className="text-xs text-zinc-500">{filtered.length} titles</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item=><article key={item.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
            <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">{item.kind} · {item.year}</span><BookOpen size={17} className="text-zinc-600"/></div>
            <h3 className="text-lg font-bold">{item.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">{item.tags.map(tag=><span key={tag} className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-zinc-400">{tag}</span>)}</div>
            <div className="mt-5 flex flex-wrap gap-2">{item.links.map(link=><a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10">{link.label}<ExternalLink size={12}/></a>)}</div>
          </article>)}
        </div>
        {filtered.length===0&&<p className="py-10 text-center text-sm text-zinc-500">No manga matched that search.</p>}
      </section>
      <section className="mb-14 rounded-3xl border border-rose-400/20 bg-gradient-to-br from-rose-950/40 to-zinc-950 p-6 md:p-9">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.25em] text-rose-300"><Sparkles size={15}/> Streamivio Original</div>
        <div className="mb-5 flex flex-wrap items-center gap-3"><h2 className="text-3xl font-black md:text-5xl">BAN KAISEN</h2><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">In development</span></div>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">An original manga project currently in development. The story and manga production are still being written and developed; no completed volume or release date is being announced yet.</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-bold">AI-assisted artwork disclosure</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">BAN KAISEN's planned manga artwork uses AI image-generation tools. The following models are part of the disclosed art workflow:</p>
          <ul className="mt-4 grid gap-2 text-sm text-zinc-200 sm:grid-cols-2">{["AnimagineXL 4.0","WAI Illustrious v14.0 (Mature)","Prefect Pony XL v3","T-PonyNAI3","Pony Diffusion V6 XL"].map(model=><li key={model} className="rounded-lg bg-white/5 px-3 py-2">{model}</li>)}</ul>
          <p className="mt-4 text-xs leading-5 text-zinc-500">These are image-generation models rather than large language models (LLMs). Any LLM-assisted writing or editing should be disclosed separately. “Mature” identifies a model variant, not an automatic age rating for the finished manga; content ratings will be assigned to the actual published material.</p>
        </div>
      </section>
      <section>
        <div className="mb-5 flex items-center gap-2"><Github size={18}/><h2 className="text-xl font-bold">Open-source manga data sources</h2></div>
        <p className="mb-4 max-w-3xl text-sm leading-6 text-zinc-400">These GitHub projects can support Streamivio's manga metadata and source discovery. They do not grant rights to republish copyrighted chapters; Streamivio links readers to publishers or rights-cleared material.</p>
        <div className="grid gap-3 md:grid-cols-2">{githubSources.map(source=><a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[.03] p-4 hover:bg-white/[.06]"><div className="flex items-center justify-between gap-3 text-sm font-semibold">{source.name}<ExternalLink size={14} className="shrink-0 text-zinc-500"/></div><p className="mt-2 text-xs leading-5 text-zinc-500">{source.note}</p></a>)}</div>
      </section>
      <footer className="mt-12 border-t border-white/10 pt-5 text-xs text-zinc-600">Streamivio Manga · Publisher links open in a new tab. Titles and reading availability may vary by region.</footer>
    </div>
  </main>;
}
