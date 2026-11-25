"use client";

import {useState} from "react";

const isAllowed=(url:URL)=>{
  const hosts=(process.env.NEXT_PUBLIC_STREAMIVIO_EMBED_HOSTS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  return hosts.some(h=>url.hostname.toLowerCase()===h||url.hostname.toLowerCase().endsWith("."+h));
};
export default function PlayerPage(){
  const [source,setSource]=useState("");
  const [active,setActive]=useState("");
  const [error,setError]=useState("");
  const [format,setFormat]=useState<"video"|"embed">("video");
  const load=()=>{
    setError("");
    try{
      const url=new URL(source.trim());
      if(url.protocol!=="https:"||url.username||url.password)throw new Error("Only secure HTTPS media URLs are accepted.");
      if(format==="embed"&&!isAllowed(url))throw new Error("This embed host is not in Streamivio's approved embed-host list.");
      setActive(url.toString());
    }catch(e){setActive("");setError(e instanceof Error?e.message:"Invalid media URL.");}
  };
  return <main className="min-h-screen bg-[#070707] text-white flex flex-col">
    <header className="border-b border-white/10 px-5 py-4"><a href="/" className="font-black tracking-[.2em] text-red-500">STREAMIVIO</a><span className="ml-3 text-xs text-zinc-500">Standalone player</span></header>
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Streamivio Player</h1><p className="mt-2 text-sm text-zinc-400">Play media from a direct, authorised HTTPS source or an approved embed provider.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><select value={format} onChange={e=>setFormat(e.target.value as "video"|"embed")} className="rounded bg-zinc-900 px-3 py-3"><option value="video">Direct MP4 / HLS</option><option value="embed">Approved embed</option></select><input value={source} onChange={e=>setSource(e.target.value)} placeholder="https://media.example/video.mp4" className="min-w-0 flex-1 rounded border border-white/15 bg-zinc-900 px-3 py-3"/><button onClick={load} className="rounded bg-red-600 px-5 py-3 font-bold">Play</button></div>
      {error&&<p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
      <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {active?format==="embed"?<iframe key={active} src={active} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<video key={active} src={active} controls autoPlay playsInline className="h-full w-full"/>:<div className="flex h-full items-center justify-center text-sm text-zinc-600">Enter an authorised media URL to begin</div>}
      </div>
      <p className="mt-4 text-xs text-zinc-500">Streamivio does not locate or unlock media. URLs must be provided by an authorised source; embed hosts must be configured in the deployment environment.</p>
    </section>
  </main>;
}
