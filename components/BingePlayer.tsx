"use client";

import { useMemo, useState } from "react";

type Props = {
  title: string;
  id: string;
  kind: "movie" | "tv";
  distributionAuthorized: boolean;
  season?: number;
  episode?: number;
};

/** BingeAPI iframe wrapper for titles whose embed/distribution use is authorized. */
export default function BingePlayer({ title, id, kind, distributionAuthorized, season = 1, episode = 1 }: Props) {
  const [error, setError] = useState(false);
  const validId = /^tt\d{5,12}$/.test(id) || /^\d{1,12}$/.test(id);
  const validEpisode = Number.isInteger(season) && season >= 1 && Number.isInteger(episode) && episode >= 1;
  const src = useMemo(() => {
    if (!distributionAuthorized || !validId || (kind === "tv" && !validEpisode)) return "";
    const path = kind === "movie" ? `/embed/movie/${encodeURIComponent(id)}` : `/embed/tv/${encodeURIComponent(id)}/${season}/${episode}`;
    return `https://bingeapi.st${path}?theme=dark&color=8b5cf6&autoplay=0`;
  }, [distributionAuthorized, validId, validEpisode, id, kind, season, episode]);

  if (!distributionAuthorized) return <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black p-6 text-center text-sm text-zinc-400">Playback is available only when Streamivio has verified authorization for this title.</div>;
  if (!validId || (kind === "tv" && !validEpisode)) return <div role="alert" className="rounded-xl bg-red-950/40 p-4 text-sm text-red-200">Invalid title or episode ID.</div>;

  return <section aria-label={`Player for ${title}`} className="w-full">
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
      {error ? <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-300">The embedded player reported an error. Please try again later.</div> : <iframe key={src} src={src} title={title} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setError(true)} />}
    </div>
    <p className="mt-2 text-xs text-zinc-500">Embedded player • Use the player controls for subtitles, quality and fullscreen.</p>
  </section>;
}
