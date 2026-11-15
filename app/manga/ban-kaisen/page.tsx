"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, List, Maximize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const pages = Array.from({ length: 40 }, (_, index) => index + 1);\n\nconst arcGuide = [
  { n: 1, title: "The Quiet Before", note: "Kira, Rengi and Hikari's everyday world begins to show cracks." },
  { n: 2, title: "Black Ink District", note: "A neighbourhood mystery exposes the first traces of Kuro Essence." },
  { n: 3, title: "The Bell That Forgot", note: "A school-day incident turns memory into a dangerous weapon." },
  { n: 4, title: "Broken Lunchbox", note: "Friendship, family pressure and a strange curse collide." },
  { n: 5, title: "Red Thread Tournament", note: "Young fighters test their beliefs in a contest with hidden rules." },
  { n: 6, title: "The Borrowed Face", note: "An enemy learns to imitate the people others trust." },
  { n: 7, title: "Under the Empty Stadium", note: "A missing-person case leads beneath the city." },
  { n: 8, title: "Kuro Essence Rising", note: "The first major confrontation reveals the cost of power." },
  { n: 9, title: "Prohibited Law", note: "Hikari Tokito faces a law that should never have been broken." },
  { n: 10, title: "Tokito Arc", note: "The Tokito history and its consequences come into focus." },
  { n: 11, title: "The Glass Shrine", note: "A sealed shrine reflects the fears of everyone who enters." },
  { n: 12, title: "Seven Unwritten Rules", note: "The group discovers seven rules governing unstable Domains." },
  { n: 13, title: "The City That Sank Upward", note: "A district turns inside out as gravity and belief collapse." },
  { n: 14, title: "No One Leaves at Dawn", note: "A night-long siege forces the cast to choose who to save." },
  { n: 15, title: "The Hollow Parade", note: "A festival becomes cover for a coordinated Kuro Essence outbreak." },
  { n: 16, title: "Ashes of the First Domain", note: "The origin of Domains is uncovered, along with a terrible lie." },
  { n: 17, title: "The Ban Court", note: "The laws behind Ban techniques are challenged in public." },
  { n: 18, title: "All Names Erased", note: "The enemy attacks identity itself; allies must remember one another." },
  { n: 19, title: "The Last Ordinary Day", note: "The cast prepares for the end and settles unfinished promises." },
  { n: 20, title: "Straight up BS in a kettle", note: "The final battle. Every rule, bond and sacrifice converges." },
];
const cast = [
  ["Kira Shikimoru", "8 · Main character"],
  ["Rengi", "8"],
  ["Hikari Tokito", "8"],
  ["Daigo Shikimoru", "14 · Kira's older brother"],
  ["Haruka", "24 · White-van driver"],
];


function MiniArtwork() {
  return <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-rose-300/20 bg-[#100d14]">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(190,40,66,.35),transparent_45%),linear-gradient(150deg,#17131d,#08090d_65%)]"/>
    <svg viewBox="0 0 640 360" className="absolute inset-0 h-full w-full" role="img" aria-label="BAN KAISEN concept art: a white van on a quiet school street">
      <path d="M0 245 640 205v155H0z" fill="#11131a"/><path d="M0 277 640 244" stroke="#4c3540" strokeWidth="2"/>
      <path d="M55 80h75v165H55zM145 48h56v197h-56zM510 65h80v155h-80z" fill="#191b25"/>
      <path d="M66 101h18v24H66zm35 0h18v24h-18zM157 72h15v25h-15zm22 0h15v25h-15zM526 91h20v28h-20zm30 0h20v28h-20z" fill="#a34c62" opacity=".5"/>
      <ellipse cx="355" cy="291" rx="185" ry="19" fill="#020305" opacity=".75"/>
      <path d="M192 172h221l54 43v64H166v-77z" fill="#e6e7e9"/><path d="M413 172v43h54l-54-43z" fill="#b9c0c9"/>
      <path d="M208 184h73v40h-73zM292 184h67v40h-67zM370 184h31v40h-31z" fill="#222a36"/>
      <path d="M174 232h285v30H174z" fill="#d9dce0"/><path d="M178 245h22v10h-22zM430 245h23v10h-23z" fill="#d65a68"/>
      <circle cx="226" cy="271" r="22" fill="#08090d" stroke="#7d818b" strokeWidth="7"/><circle cx="402" cy="271" r="22" fill="#08090d" stroke="#7d818b" strokeWidth="7"/>
      <text x="30" y="45" fill="#f5dce2" fontSize="15" letterSpacing="5">BAN KAISEN · VOL. 01</text>
    </svg>
  </div>;
}

export default function BanKaisenReaderPage() {
  const [page, setPage] = useState(1);
  const [showContents, setShowContents] = useState(true);
  const [readingMode, setReadingMode] = useState<"single" | "scroll">("single");
  const [showDetails, setShowDetails] = useState(false);
  const progress = Math.round((page / 40) * 100);
  const pageLabel = useMemo(() => String(page).padStart(2, "0"), [page]);

  const go = (next: number) => setPage(Math.max(1, Math.min(40, next)));

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090d]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/manga" aria-label="Back to manga" className="rounded-full border border-white/10 p-2 text-zinc-300 hover:bg-white/10"><ArrowLeft size={18}/></Link>
            <div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.25em] text-rose-300">Streamivio Original</p><h1 className="truncate text-sm font-black sm:text-base">BAN KAISEN <span className="font-normal text-zinc-500">/ Chapter 1</span></h1></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowContents(!showContents)} className="rounded-full border border-white/10 p-2 text-zinc-300 hover:bg-white/10" aria-label="Toggle contents">{showContents ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}</button>
            <button onClick={() => setReadingMode(readingMode === "single" ? "scroll" : "single")} className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10">{readingMode === "single" ? "Single page" : "Scroll mode"}</button>
          </div>
        </div>
        <div className="h-[2px] bg-white/5"><div className="h-full bg-rose-400 transition-all" style={{ width: progress + "%" }}/></div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[270px_minmax(0,1fr)]">
        {showContents && <aside className="border-b border-white/10 p-5 lg:min-h-[calc(100vh-62px)] lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-zinc-500">Series contents</p>
          <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/[.06] p-4">
            <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">In development</span>
            <div className="mt-3"><MiniArtwork/></div><h2 className="mt-3 text-xl font-black">Whispers from The Heart</h2>
            <p className="mt-1 text-xs text-zinc-500">Volume 1 · Chapter 1</p>
            <p className="mt-3 text-xs leading-5 text-zinc-400">The White Van</p>
          </div>
          <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Chapter pages</p>
          <div className="grid grid-cols-5 gap-1.5">{pages.map(number => <button key={number} onClick={() => go(number)} className={"rounded-lg py-2 text-xs transition " + (page === number ? "bg-rose-400 font-bold text-black" : "bg-white/[.04] text-zinc-400 hover:bg-white/10")}>{number}</button>)}</div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Opening cast</p>
            <ul className="mt-3 space-y-3">{cast.map(([name, detail]) => <li key={name}><p className="text-xs font-semibold text-zinc-200">{name}</p><p className="text-[10px] text-zinc-500">{detail}</p></li>)}</ul>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Complete arc roadmap · 20 arcs</p><ol className="mt-3 space-y-3">{arcGuide.map((arc) => <li key={arc.n} className="border-l border-rose-300/30 pl-3"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Arc {arc.n}{arc.n === 20 ? " · Final battle" : ""}</p><p className="mt-1 text-xs font-semibold text-zinc-200">{arc.title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-500">{arc.note}</p></li>)}</ol><p className="mt-4 text-[10px] leading-5 text-rose-200">Divine Arc is removed and is not part of this roadmap. Arcs 1–8 and 11–20 are newly proposed story development, while Arcs 9–10 retain the established titles.</p></div>
        </aside>}

        <section className="min-w-0 px-4 py-6 md:px-8 md:py-9">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-4"><div className="w-28 shrink-0"><MiniArtwork/></div><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-rose-300">Volume 1 · Whispers from The Heart</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">The White Van</h2><p className="mt-1 text-xs text-zinc-500">Page {page} of 40</p></div></div>
              <button onClick={() => setShowDetails(!showDetails)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/10">{showDetails ? "Hide chapter notes" : "Chapter notes"}</button>
            </div>
            {showDetails && <div className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm leading-6 text-zinc-400"><p>Chapter 1 follows an ordinary school day: the morning white-van ride, classes, football, lunch, a conversation between Kira and Hikari, and the journey home. The 40-page chapter plan is registered, but its final page-by-page manuscript, finished artwork and lettering are still being prepared.</p></div>}
            <div className="relative mx-auto flex min-h-[55vh] max-w-[760px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#111218] p-6 shadow-2xl sm:min-h-[72vh] sm:p-12">
              <div className="pointer-events-none absolute inset-0 opacity-[.035]" style={{ backgroundImage: "linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)", backgroundPosition: "0 0, 8px 8px", backgroundSize: "16px 16px" }}/>
              <div className="relative max-w-md text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/[.07] text-rose-300"><BookOpen size={25}/></div>
                <p className="text-[10px] font-bold uppercase tracking-[.3em] text-rose-300">BAN KAISEN · THE WHITE VAN</p>
                <h3 className="mt-3 text-4xl font-black tracking-tight">PAGE {pageLabel}</h3>
                <div className="mx-auto my-5 h-px w-16 bg-rose-300/40"/>
                <p className="text-sm leading-7 text-zinc-300">Manga page artwork and final lettering are in production.</p>
                <p className="mt-3 text-xs leading-6 text-zinc-500">This reader is ready for the original page files. No placeholder chapter panels or invented story scenes are presented as finished canon.</p>
                {page === 1 && <p className="mt-6 text-xs font-medium text-zinc-400">Chapter 1 · “The White Van”</p>}
              </div>
              <span className="absolute bottom-4 right-5 font-mono text-[10px] text-zinc-600">{pageLabel} / 40</span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button disabled={page === 1} onClick={() => go(page - 1)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={16}/> Previous</button>
              <span className="text-xs tabular-nums text-zinc-500">{progress}%</span>
              <button disabled={page === 40} onClick={() => go(page + 1)} className="inline-flex items-center gap-2 rounded-full bg-rose-400 px-4 py-3 text-xs font-bold text-black hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-30">Next page <ChevronRight size={16}/></button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-zinc-500"><span>Original series · Creator-owned story</span><Link href="/manga" className="hover:text-white">Back to Manga library</Link></div>
          </div>
        </section>
      </div>
    </main>
  );
}
