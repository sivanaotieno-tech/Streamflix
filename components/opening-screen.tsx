"use client";

import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { StreamivioLogo } from "@/components/streamivio-logo";

export function OpeningScreen() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <section className="streamivio-opening fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#050b14] px-5 text-white" aria-label="Welcome to Streamivio">
      <div className="opening-glow opening-glow-one" aria-hidden="true" />
      <div className="opening-glow opening-glow-two" aria-hidden="true" />
      <div className="opening-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="opening-mark mb-9 flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-sky-300/25 bg-sky-400/10 shadow-[0_0_70px_rgba(53,168,245,.18)]">
          <Play className="ml-1 h-9 w-9 fill-sky-300 text-sky-300" />
        </div>
        <StreamivioLogo className="text-5xl sm:text-7xl md:text-8xl" />
        <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-xl sm:leading-8">
          Stories worth discovering. Movies, series, anime and more — all in one place.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="group mt-10 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-sky-400 px-8 py-4 text-sm font-black tracking-wide text-[#04111d] shadow-[0_12px_40px_rgba(53,168,245,.24)] transition duration-200 hover:-translate-y-1 hover:bg-sky-300 hover:shadow-[0_16px_50px_rgba(53,168,245,.34)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-sky-200"
        >
          Enter Streamivio
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.28em] text-slate-500">Your next story starts here</p>
      </div>
      <style jsx>{`
        .opening-grid {
          position: absolute; inset: 0; opacity: .18; pointer-events: none;
          background-image: linear-gradient(rgba(148,190,225,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,190,225,.08) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
        }
        .opening-glow { position:absolute; width:min(75vw,760px); aspect-ratio:1; border-radius:999px; filter:blur(100px); pointer-events:none; }
        .opening-glow-one { top:-48%; left:-24%; background:rgba(21,112,180,.22); }
        .opening-glow-two { right:-28%; bottom:-58%; background:rgba(17,70,130,.3); }
        .opening-mark { animation: opening-float 4s ease-in-out infinite; }
        @keyframes opening-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-9px); } }
        @media (prefers-reduced-motion: reduce) { .opening-mark { animation:none; } }
      `}</style>
    </section>
  );
}
