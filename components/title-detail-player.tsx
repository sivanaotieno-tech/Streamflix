"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
  kind: "movie" | "tv";
  imdbId?: string;
};

export function TitleDetailPlayer({ id, title, kind, imdbId }: Props) {
  const [loading, setLoading] = useState(false);
  const [playerUrl, setPlayerUrl] = useState("");
  const [format, setFormat] = useState("");
  const [error, setError] = useState("");

  async function play() {
    setLoading(true);
    setError("");
    setPlayerUrl("");
    try {
      const params = new URLSearchParams({ id, title, type: kind });
      if (imdbId) params.set("imdb_id", imdbId);
      const response = await fetch("/api/playback?" + params.toString(), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload?.available !== true) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Playback could not be confirmed for this title.");
      }
      const url = typeof payload.embed_url === "string" ? payload.embed_url : payload.stream_url;
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("The playback service did not return a valid HTTPS player URL.");
      }
      setFormat(typeof payload.format === "string" ? payload.format : "iframe");
      setPlayerUrl(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playback is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <button type="button" onClick={play} disabled={loading} className="rounded-lg bg-[#e50914] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
        {loading ? "Checking playback…" : playerUrl ? "Reload player" : "Play"}
      </button>
      {error && <p role="status" className="mt-4 text-sm text-amber-300">{error}</p>}
      {playerUrl && (
        <div className="mt-5 overflow-hidden rounded-xl bg-black">
          {(format === "mp4" || format === "hls")
            ? <video key={playerUrl} controls playsInline className="aspect-video w-full" src={playerUrl}>Your browser cannot play this video format.</video>
            : <iframe key={playerUrl} title={"Streamivio player for " + title} src={playerUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="aspect-video w-full border-0" />}
          <p className="px-3 py-2 text-xs text-zinc-400">Availability can vary by title and region. Only play media you are authorized to access.</p>
        </div>
      )}
    </div>
  );
}
