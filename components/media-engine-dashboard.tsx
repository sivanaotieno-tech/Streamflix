"use client";

import { useEffect, useState } from "react";

type StatusPayload = {
  health?: { service?: string; status?: string; metadata?: string; playback?: string;  };
  providers?: { providers?: Array<{ id: string; role: string; configured: boolean; enabled?: boolean; status?: string; playback_access?: string; warning?: string }> };
  error?: string;
};

export function MediaEngineDashboard() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/media/status", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Media Engine status is unavailable.");
        if (active) setData(payload);
      })
      .catch((error) => { if (active) setData({ error: error instanceof Error ? error.message : "Status unavailable." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const providers = data?.providers?.providers || [];
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-500">Streamivio</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Media Engine</h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">Standalone discovery and authorised playback. Video processing runs separately from the Vercel website.</p>
      {loading ? <p className="mt-8 text-sm text-zinc-400">Checking connected services…</p> : data?.error ? (
        <p role="status" className="mt-8 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200">{data.error}</p>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <article key={provider.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{provider.id === "streamx" ? "StreamX metadata" : provider.id === "anilist" ? "AniList metadata" : "Hovod video engine"}</h2>
                <span className={"rounded-full px-3 py-1 text-xs " + (provider.enabled || (provider.configured && !String(provider.status || "").includes("disabled")) ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800 text-zinc-400")}>{provider.enabled ? "Enabled" : String(provider.status || "").includes("disabled") ? "Disabled pending review" : provider.configured ? "Configured" : "Not configured"}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{provider.role}</p>
              <p className="mt-4 text-sm text-zinc-300">{provider.status || "Waiting for configuration"}</p>
              {provider.warning && <p className="mt-3 text-xs leading-5 text-amber-300">{provider.warning}</p>}
            </article>
          ))}
        </section>
      )}
      <section className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
        <h2 className="font-bold">Deployment model</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
          <li>Website and Streamivio API: Vercel.</li>
          <li>Hovod API and FFmpeg workers: persistent cloud VM.</li>
          <li>Original media and HLS renditions: private S3-compatible object storage.</li>
          <li>Only titles with a verified rights record can be enabled for playback.</li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">Hovod public playback IDs are unlisted, not access-controlled. Do not use this configuration for subscriber-only titles.</p>
      </section>
    </main>
  );
}
