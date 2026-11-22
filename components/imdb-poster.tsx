"use client";

import { useEffect, useState } from "react";

type PosterData = { image?: string };
export function ImdbPoster({ title, year }: { title: string; year: string }) {
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const query = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, ""));
    fetch("https://proxy.cors.dev/https://v3.sg.media-imdb.com/suggestion/x/" + query + ".json", { credentials: "omit" })
      .then((r) => { if (!r.ok) throw new Error("poster lookup failed"); return r.json(); })
      .then((data) => {
        const item = (data?.d || []).find((x: any) => x?.l?.toLowerCase() === title.toLowerCase() && String(x?.y || "") === year && x?.i?.imageUrl);
        if (!cancelled && item?.i?.imageUrl) setPoster(item.i.imageUrl);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [title, year]);
  return poster ? <img src={poster} alt={title + " IMDb poster"} loading="lazy" className="h-full w-full object-cover" /> :
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-950 via-zinc-800 to-zinc-950 p-3 text-center font-bold text-zinc-200">{title}</div>;
}
