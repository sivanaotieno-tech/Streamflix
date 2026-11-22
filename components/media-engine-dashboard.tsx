"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MediaItem = { Id: string; Name: string; Type: string; ProductionYear?: number; Overview?: string; ImageTags?: Record<string, string> };
type MediaStream = { Index: number; Type: string; Codec?: string; Language?: string; DisplayTitle?: string; IsDefault?: boolean; IsForced?: boolean; IsExternal?: boolean };
type PlaybackInfo = { MediaSources?: Array<{ Id: string; SupportsDirectPlay?: boolean; SupportsTranscoding?: boolean; DirectStreamUrl?: string; TranscodingUrl?: string; MediaStreams?: MediaStream[] }>; };
const apiBase = (process.env.NEXT_PUBLIC_STREAMIVIO_API_URL || "").replace(/\/+$/, "");

export function MediaEngineDashboard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [subtitleIndex, setSubtitleIndex] = useState(-1);
  const [audioIndex, setAudioIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const lastProgressSecond = useRef(0);

  const headers = useMemo(() => token ? { Authorization: `MediaBrowser Token="${token}"` } : {}, [token]);
  const streams = playback?.MediaSources?.[0]?.MediaStreams || [];
  const audioStreams = streams.filter((stream) => stream.Type === "Audio");
  const subtitleStreams = streams.filter((stream) => stream.Type === "Subtitle");

  useEffect(() => () => { hlsRef.current?.destroy(); if (scriptRef.current?.parentNode) scriptRef.current.parentNode.removeChild(scriptRef.current); }, []);

  async function api(path: string, init: RequestInit = {}) {
    if (!apiBase) throw new Error("Set NEXT_PUBLIC_STREAMIVIO_API_URL to your deployed Streamivio API URL.");
    const response = await fetch(apiBase + path, {
      ...init,
      headers: { ...headers, ...(init.headers || {}) },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || payload.error || `Media Engine request failed (${response.status})`);
    return payload;
  }

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("/media/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      setToken(result.access_token); setUserName(result.user?.name || username); setPassword("");
      const library = await fetchItems(result.access_token, "");
      setItems(library);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed."); }
    finally { setBusy(false); }
  }

  async function fetchItems(sessionToken = token, search = query) {
    if (!apiBase) throw new Error("Set NEXT_PUBLIC_STREAMIVIO_API_URL to your deployed Streamivio API URL.");
    const params = new URLSearchParams({ limit: "60" });
    if (search.trim()) params.set("q", search.trim());
    const response = await fetch(apiBase + "/media/items?" + params, { headers: { Authorization: `MediaBrowser Token="${sessionToken}"` }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || "Could not load your Jellyfin library.");
    return (payload.Items || []) as MediaItem[];
  }

  async function searchLibrary(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setItems(await fetchItems(token, query)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Search failed."); }
    finally { setBusy(false); }
  }

  async function startPlayback(item: MediaItem, audio = -1, subtitle = -1) {
    setBusy(true); setError(""); setStreamUrl(""); hlsRef.current?.destroy(); setSelected(item);
    try {
      const info = await api(`/media/items/${encodeURIComponent(item.Id)}/playback-info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: "streamivio-web", audio_stream_index: audio >= 0 ? audio : null, subtitle_stream_index: subtitle }),
      }) as PlaybackInfo;
      setPlayback(info);
      const source = info.MediaSources?.[0];
      const base = info.Streamivio?.server_url || "";
      const raw = source?.TranscodingUrl || source?.DirectStreamUrl || `/Videos/${item.Id}/master.m3u8`;
      const url = new URL(raw, base);
      url.searchParams.set("api_key", token);
      setAudioIndex(audio); setSubtitleIndex(subtitle); setStreamUrl(url.toString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start playback."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      const Hls = (window as any).Hls;
      if (Hls?.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
      } else {
        setError("This browser cannot play HLS. Try a compatible direct-play format.");
      }
    };
    if ((window as any).Hls) attach();
    else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
      script.async = true;
      script.onload = attach;
      script.onerror = () => setError("Could not load the HLS player. Check your connection.");
      scriptRef.current = script;
      document.head.appendChild(script);
    }
    return () => { cancelled = true; hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [streamUrl]);

  async function reportProgress(stopped = false) {
    if (!selected || !videoRef.current || !token) return;
    const currentSecond = Math.floor(videoRef.current.currentTime);
    if (!stopped && currentSecond - lastProgressSecond.current < 20) return;
    lastProgressSecond.current = currentSecond;
    const ticks = Math.max(0, Math.floor(videoRef.current.currentTime * 10_000_000));
    const path = stopped ? `/media/sessions/${selected.Id}/stopped?position_ticks=${ticks}` : `/media/sessions/${selected.Id}/progress?position_ticks=${ticks}`;
    try { await api(path, { method: "POST" }); } catch { /* Progress reporting must not interrupt playback. */ }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 text-white">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-500">Streamivio</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Media Engine</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">Your private library, playback sessions, subtitles and adaptive streaming in one place.</p>
      </div>
      {!token ? (
        <form onSubmit={login} className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-lg font-bold">Connect your Jellyfin server</h2>
          <label className="block text-sm text-zinc-300">Jellyfin username<input required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white" /></label>
          <label className="block text-sm text-zinc-300">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white" /></label>
          <button disabled={busy} className="w-full rounded-lg bg-red-600 px-4 py-3 font-bold disabled:opacity-50">{busy ? "Connecting…" : "Connect library"}</button>
          <p className="text-xs text-zinc-500">Your credentials are sent to your configured Streamivio API and authenticated by your Jellyfin server. Your session token stays in this page's memory.</p>
        </form>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">Connected as <strong>{userName}</strong></p>
            <button onClick={() => { setToken(""); setItems([]); setPlayback(null); setStreamUrl(""); }} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Disconnect</button>
          </div>
          <form onSubmit={searchLibrary} className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3" />
            <button disabled={busy} className="rounded-lg bg-red-600 px-5 font-bold">Search</button>
          </form>
          {selected && streamUrl && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video ref={videoRef} controls autoPlay playsInline className="aspect-video w-full" onTimeUpdate={() => { const v = videoRef.current; if (v && Math.floor(v.currentTime) > 0 && Math.floor(v.currentTime) % 20 === 0) void reportProgress(); }} onEnded={() => void reportProgress(true)} />
              <div className="flex flex-wrap gap-3 border-t border-white/10 p-4">
                <label className="text-xs text-zinc-400">Audio
                  <select value={audioIndex} onChange={(e) => { const value = Number(e.target.value); setAudioIndex(value); void startPlayback(selected, value, subtitleIndex); }} className="ml-2 rounded bg-zinc-800 p-2 text-white">
                    <option value={-1}>Auto</option>{audioStreams.map((s) => <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || s.Codec || `Track ${s.Index + 1}`}</option>)}
                  </select>
                </label>
                <label className="text-xs text-zinc-400">Subtitles
                  <select value={subtitleIndex} onChange={(e) => { const value = Number(e.target.value); setSubtitleIndex(value); void startPlayback(selected, audioIndex, value); }} className="ml-2 rounded bg-zinc-800 p-2 text-white">
                    <option value={-1}>Off / Auto</option>{subtitleStreams.map((s) => <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || s.Codec || `Track ${s.Index + 1}`}{s.IsForced ? " · Forced" : ""}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button key={item.Id} onClick={() => void startPlayback(item)} className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:border-red-500/60">
                <p className="font-bold">{item.Name}</p><p className="mt-1 text-xs uppercase text-zinc-500">{item.Type}{item.ProductionYear ? ` · ${item.ProductionYear}` : ""}</p>
                {item.Overview && <p className="mt-3 line-clamp-3 text-sm text-zinc-400">{item.Overview}</p>}
              </button>
            ))}
          </div>
          {!items.length && <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-400">No titles returned. Add a library and scan it in Jellyfin, then search again.</p>}
        </section>
      )}
      {error && <p role="alert" className="mt-6 rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">{error}</p>}
      {busy && <p className="mt-4 text-sm text-zinc-500">Working…</p>}
    </main>
  );
}
