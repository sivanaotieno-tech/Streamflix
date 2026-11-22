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
  const [format, setFormat] = useState<"mp4" | "hls" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function play() {
    setLoading(true);
    setError("");
    setNotice("");
    setPlayerUrl("");
    try {
      const params = new URLSearchParams({ id, title, type: kind });
      if (imdbId) params.set("imdb_id", imdbId);
      const response = await fetch("/api/playback?" + params.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.available !== true) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No authorized playback source is configured for this title.");
      }
      if (payload.format !== "mp4" && payload.format !== "hls") {
        throw new Error("The configured media source uses an unsupported format. Streamivio currently supports MP4 and HLS.");
      }
      const url = payload.stream_url;
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("The media service did not return a valid HTTPS media URL.");
      }
      setFormat(payload.format);
      setNotice(typeof payload.notice === "string" ? payload.notice : "");
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
      {error && <p role="status" className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">{error}</p>}
      {playerUrl && (
        <div className="mt-5 overflow-hidden rounded-xl bg-black">
          <video
            key={playerUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            src={playerUrl}
            onError={() => setError("The media host did not deliver a playable stream. Check the URL, CORS policy, codec and access permissions.")}
          >
            Your browser cannot play this video format.
          </video>
          {notice && <p className="px-3 py-2 text-xs text-zinc-400">{notice}</p>}
          <p className="px-3 pb-3 text-xs text-zinc-500">{format.toUpperCase()} · Only media Streamivio is authorized to play should be configured here.</p>
        </div>
      )}
    </div>
  );
}
