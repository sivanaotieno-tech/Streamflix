"use client";

import { useEffect, useRef, useState } from "react";

type Props = { id: string; title: string; kind: "movie" | "tv"; imdbId?: string };

export function TitleDetailPlayer({ id, title, kind, imdbId }: Props) {
  const [loading, setLoading] = useState(false);
  const [playerUrl, setPlayerUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "hls" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");\n  const [season, setSeason] = useState("1");\n  const [episode, setEpisode] = useState("1");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!playerUrl || format !== "hls") return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: any = null;
    let script: HTMLScriptElement | null = null;
    const attach = () => {
      if (cancelled) return;
      const Hls = (window as any).Hls;
      if (Hls?.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(playerUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
          if (data?.fatal && !cancelled) setError("The HLS stream failed. Check the media host, CORS policy and source availability.");
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = playerUrl;
      else setError("This browser cannot play HLS. Try a compatible browser or direct-play source.");
    };
    if ((window as any).Hls) attach();
    else {
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
      script.async = true;
      script.onload = attach;
      script.onerror = () => { if (!cancelled) setError("Could not load the HLS player."); };
      document.head.appendChild(script);
    }
    return () => { cancelled = true; hls?.destroy(); if (script?.parentNode) script.parentNode.removeChild(script); };
  }, [playerUrl, format]);

  async function play() {
    setLoading(true); setError(""); setNotice(""); setPlayerUrl(""); setEmbedUrl(""); setFormat("");
    try {
      const params = new URLSearchParams({ id, title, type: kind });
      if (imdbId) params.set("imdb_id", imdbId);\n      if (kind === "tv") { params.set("season", season); params.set("episode", episode); }
      const response = await fetch("/api/playback?" + params.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.available !== true) throw new Error(typeof payload?.error === "string" ? payload.error : "No authorised playback source is configured.");
      setNotice(typeof payload.notice === "string" ? payload.notice : "");
      if (payload.format === "embed" && typeof payload.player_url === "string" && payload.player_url.startsWith("https://")) {
        setEmbedUrl(payload.player_url);
        return;
      }
      if (payload.format !== "mp4" && payload.format !== "hls") throw new Error("The media service returned an unsupported playback format.");
      if (typeof payload.stream_url !== "string" || !payload.stream_url.startsWith("https://")) throw new Error("The media service did not return a valid HTTPS media URL.");
      setFormat(payload.format); setPlayerUrl(payload.stream_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playback is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  return (
    <div className="mt-8">
      <button type="button" onClick={play} disabled={loading} className="rounded-lg bg-[#e50914] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
        {loading ? "Checking playback…" : playerUrl || embedUrl ? "Reload player" : "Play"}
      </button>
      {error && <p role="status" className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">{error}</p>}
      {embedUrl && (
        <div className="mt-5 overflow-hidden rounded-xl bg-black">
          <iframe src={embedUrl} title={title + " — Streamivio player"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="aspect-video w-full border-0" />
          {notice && <p className="px-3 py-2 text-xs text-zinc-400">{notice}</p>}
        </div>
      )}
      {playerUrl && (
        <div className="mt-5 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} key={playerUrl} controls playsInline preload="metadata" className="aspect-video w-full" src={format === "mp4" ? playerUrl : undefined} onError={() => setError("The media host did not deliver a playable stream. Check the URL, CORS policy, codec and access permissions.")}>
            Your browser cannot play this video format.
          </video>
          {notice && <p className="px-3 py-2 text-xs text-zinc-400">{notice}</p>}
          <p className="px-3 pb-3 text-xs text-zinc-500">{format.toUpperCase()} · Only media Streamivio is authorised to distribute is enabled.</p>
        </div>
      )}
    </div>
  );
}
