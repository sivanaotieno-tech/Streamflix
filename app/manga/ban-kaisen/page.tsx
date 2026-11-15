"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

const arcs = [
  ["The Quiet Before", "Kira, Rengi and Hikari's ordinary world begins to show cracks."],
  ["Black Ink District", "A neighbourhood mystery exposes the first traces of Kuro Essence."],
  ["The Bell That Forgot", "A school incident turns memory into a dangerous weapon."],
  ["Broken Lunchbox", "Friendship, family pressure and a strange curse collide."],
  ["Red Thread Tournament", "Young fighters test their beliefs in a contest with hidden rules."],
  ["The Borrowed Face", "An enemy imitates the people others trust."],
  ["Under the Empty Stadium", "A missing-person case leads beneath the city."],
  ["Kuro Essence Rising", "The first major confrontation reveals the cost of power."],
  ["Prohibited Law", "Hikari Tokito faces a law that should never have been broken."],
  ["Tokito Arc", "The Tokito history and its consequences come into focus."],
  ["The Glass Shrine", "A sealed shrine reflects the fears of everyone who enters."],
  ["Seven Unwritten Rules", "The group discovers seven rules governing unstable Domains."],
  ["The City That Sank Upward", "A district turns inside out as gravity and belief collapse."],
  ["No One Leaves at Dawn", "A night-long siege forces the cast to choose who to save."],
  ["The Hollow Parade", "A festival becomes cover for a Kuro Essence outbreak."],
  ["Ashes of the First Domain", "The origin of Domains is uncovered, along with a terrible lie."],
  ["The Ban Court", "The laws behind Ban techniques are challenged in public."],
  ["All Names Erased", "The enemy attacks identity itself; allies must remember one another."],
  ["The Last Ordinary Day", "The cast prepares for the end and settles unfinished promises."],
  ["The Unnecessary Incident", "Final arc. The promised straight-up-BS-in-a-kettle level of escalating chaos."],
];

const cast = [
  ["Kira Shikimoru", "8 · 127 cm · Quiet, kind and imaginative"],
  ["Rengi", "8"],
  ["Hikari Tokito", "8"],
  ["Daigo Shikimoru", "14 · Kira's older brother"],
  ["Haruka", "24 · White-van driver"],
  ["Kaito, Renjiro, Daichi, Haruki", "White-van classmates"],
  ["Takeshi, Taiga, Kuroda, Ryota, Shinobu, Masato", "White-van classmates"],
];

export default function BanKaisenReaderPage() {
  const [page, setPage] = useState(1);
  const [showScroll, setShowScroll] = useState(false);
  const [showArcGuide, setShowArcGuide] = useState(true);
  const change = (value: number) => setPage(Math.max(1, Math.min(40, value)));

  return <main className="min-h-screen bg-[#08090d] text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090d]/95 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/manga" className="rounded-full border border-white/10 p-2"><ArrowLeft size={18}/></Link><div><p className="text-[10px] uppercase tracking-[.25em] text-rose-300">Streamivio Original · In development</p><h1 className="font-black">BAN KAISEN</h1></div></div><button onClick={()=>setShowScroll(!showScroll)} className="rounded-full border border-white/15 px-3 py-2 text-xs">{showScroll?"Single page":"Scroll mode"}</button></div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-6">
        <div className="rounded-2xl border border-rose-300/20 bg-rose-950/20 p-5"><div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[radial-gradient(ellipse_at_70%_20%,rgba(190,40,66,.35),transparent_50%),linear-gradient(145deg,#17131d,#08090d)]"><span className="text-center text-3xl font-black tracking-widest text-rose-100">BAN<br/>KAISEN</span></div><p className="mt-4 text-[10px] uppercase tracking-widest text-rose-300">Volume 1</p><h2 className="mt-1 text-xl font-black">Whispers from The Heart</h2><p className="mt-2 text-sm text-zinc-400">Chapter 1 · The White Van</p><span className="mt-3 inline-block rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase text-amber-200">Manuscript & art in development</span></div>
        <div className="rounded-2xl border border-white/10 p-5"><h3 className="font-bold">Opening cast</h3><ul className="mt-3 space-y-3">{cast.map(([name,detail])=><li key={name}><p className="text-sm font-semibold">{name}</p><p className="text-xs text-zinc-500">{detail}</p></li>)}</ul></div>
        <div id="arc-guide" className="rounded-2xl border border-white/10 p-5"><button onClick={()=>setShowArcGuide(!showArcGuide)} className="flex w-full items-center justify-between text-left font-bold">Complete saga arc guide <span>{showArcGuide?"−":"+"}</span></button>{showArcGuide&&<ol className="mt-4 space-y-3">{arcs.map(([title,note],i)=><li key={title} className="border-l border-rose-300/30 pl-3"><p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Arc {i+1}{i===19?" · Final arc":""}</p><p className="mt-1 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{note}</p></li>)}</ol>}<p className="mt-4 text-[10px] leading-5 text-zinc-500">Arcs 1–8 and 11–20 are proposed creative development. Arcs 9–10 preserve the established titles. Divine Arc is excluded from canon.</p></div>
      </aside>
      <section className="min-w-0">
        <div className="mb-5"><p className="text-[10px] uppercase tracking-[.25em] text-rose-300">Volume 1 · Whispers from The Heart</p><h2 className="mt-1 text-3xl font-black">The White Van</h2><p className="mt-1 text-xs text-zinc-500">Chapter 1 · Page {page} of 40</p></div>
        <div className={showScroll?"space-y-4":" "}>
          {(showScroll?[1,2,3,4,5,6,7,8,9,10]:[page]).map(n=><div key={n} className="relative flex min-h-[65vh] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#111218] p-8 text-center">
            <div><BookOpen className="mx-auto text-rose-300" size={32}/><p className="mt-5 text-[10px] font-bold uppercase tracking-[.3em] text-rose-300">BAN KAISEN · THE WHITE VAN</p><h3 className="mt-3 text-4xl font-black">PAGE {String(n).padStart(2,"0")}</h3><p className="mx-auto mt-5 max-w-md text-sm leading-7 text-zinc-300">Original page manuscript, manga artwork and lettering are being produced. This placeholder is not presented as a finished manga page.</p><p className="mt-3 text-xs text-zinc-500">Page {n} / 40 · Volume 1</p></div>
          </div>)}
        </div>
        {!showScroll&&<div className="mt-5 flex items-center justify-between"><button disabled={page===1} onClick={()=>change(page-1)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs disabled:opacity-30"><ChevronLeft size={16}/> Previous</button><span className="text-xs text-zinc-500">{Math.round(page/40*100)}%</span><button disabled={page===40} onClick={()=>change(page+1)} className="inline-flex items-center gap-2 rounded-full bg-rose-400 px-4 py-3 text-xs font-bold text-black disabled:opacity-30">Next page <ChevronRight size={16}/></button></div>}
        <p className="mt-8 border-t border-white/10 pt-5 text-xs text-zinc-500">Kuro Essence · Domains · Ban Law · Original creator-owned story. The saga's chapter count and publication volumes will be assigned as scripts are completed; no empty or invented chapters are counted as published.</p>
      </section>
    </div>
  </main>;
}
