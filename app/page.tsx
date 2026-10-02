"use client";

import {useEffect,useState} from "react";
import {Search,Play,Plus,Film,Clapperboard,X,Radio} from "lucide-react";

type Item={
  id:string|number;
  title?:string;
  name?:string;
  overview?:string;
  poster?:string|null;
  rating?:number;
  year?:string;
  source:string;
  url?:string;
  videoUrl?:string;
  videoType?:"mp4"|"webm";
};

const tv=(x:any):Item=>({id:"tv-"+x.id,name:x.name,overview:(x.summary||"").replace(/<[^>]*>/g,""),poster:x.image?.original||x.image?.medium,rating:x.rating?.average||0,year:(x.premiered||"").slice(0,4),source:"TVmaze",url:x.url});
const anime=(x:any):Item=>({id:"anime-"+x.mal_id,name:x.title,overview:x.synopsis||"",poster:x.images?.jpg?.large_image_url||x.images?.jpg?.image_url,rating:x.score||0,year:(x.aired?.from||"").slice(0,4),source:"Jikan",url:x.url});
const archive=(x:any):Item=>({id:"ia-"+x.identifier,title:x.title||x.identifier,overview:x.description?.replace(/<[^>]*>/g,"")||"Internet Archive movie",source:"Internet Archive",year:(x.date||"").slice(0,4),url:"https://archive.org/details/"+x.identifier});
const live=(x:any):Item=>({id:"live-"+x.id,title:x.name,overview:[x.country,x.language].filter(Boolean).join(" · "),poster:x.logo||null,source:"iptv-org",videoUrl:x.streams?.[0]?.url});

function Row({title,items,onOpen}:{title:string;items:Item[];onOpen:(m:Item)=>void}){
  return <section className="mb-10">
    <div className="mb-3 flex items-center justify-between px-5 md:px-10">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <span className="text-xs text-zinc-500">Open sources</span>
    </div>
    <div className="scrollbar-hide flex gap-3 overflow-x-auto px-5 md:px-10">
      {items.map(m=><button key={String(m.id)} onClick={()=>onOpen(m)} className="card min-w-[150px] text-left md:min-w-[190px]">
        <div className="aspect-[2/3] overflow-hidden rounded-md bg-zinc-900">
          {m.poster?<img src={m.poster} className="h-full w-full object-cover" alt=""/>:<div className="flex h-full items-center justify-center">{m.source==="iptv-org"?<Radio className="h-12 w-12 text-zinc-700"/>:<Film className="h-12 w-12 text-zinc-700"/>}</div>}
        </div>
        <div className="mt-2 truncate text-sm font-semibold">{m.title||m.name}</div>
        <div className="text-xs text-zinc-400">{m.source}{m.rating?" · ★ "+m.rating.toFixed(1):""}</div>
      </button>)}
    </div>
  </section>
}

function Player({movie,onClose}:{movie:Item;onClose:()=>void}){
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-3 md:p-8" onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} className="w-full max-w-5xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">{movie.title||movie.name}</div>
          <div className="text-xs text-zinc-400">Streaming from {movie.source}</div>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2"><X/></button>
      </div>
      {movie.source==="Hovod" && movie.videoUrl ? (
        <iframe
          className="aspect-video w-full rounded-lg bg-black shadow-2xl"
          src={movie.videoUrl}
          title={movie.title||movie.name||"Streamflix video"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video className="w-full rounded-lg bg-black shadow-2xl" controls autoPlay playsInline preload="metadata" src={movie.videoUrl}/>
      )}
      <p className="mt-3 text-xs text-zinc-400">Streamflix uses the self-hosted Hovod video server for your uploaded videos. Vercel does not proxy the video bytes.</p>
    </div>
  </div>
}

export default function Home(){
  const[rows,setRows]=useState<Record<string,Item[]>>({});
  const[hero,setHero]=useState<Item|null>(null);
  const[q,setQ]=useState("");
  const[results,setResults]=useState<Item[]>([]);
  const[selected,setSelected]=useState<Item|null>(null);
  const[player,setPlayer]=useState<Item|null>(null);
  const[list,setList]=useState<Item[]>([]);
  const [browse,setBrowse]=useState("Home");
  const [loading,setLoading]=useState(true);

  const get=async(s:string,p:string)=>{
    const r=await fetch("/api/catalog?source="+s+"&path="+encodeURIComponent(p));
    if(!r.ok)throw Error();
    return r.json();
  };

  const play=async(m:Item)=>{
    if(m.videoUrl){setPlayer(m);return}
    if(m.source==="Internet Archive"){
      const id=String(m.id).replace(/^ia-/,"");
      try{
        const r=await fetch("/api/stream?identifier="+encodeURIComponent(id));
        if(!r.ok)throw Error();
        const data=await r.json();
        setPlayer({...m,videoUrl:data.url,videoType:data.type});
        return;
      }catch{setSelected(m);return}
    }
    setSelected(m);
  };

  useEffect(()=>{
    const load=async()=>{
      const results=await Promise.allSettled([
        get("tvmaze","/shows?page=0"),
        get("jikan","/top/anime?filter=bypopularity&limit=20"),
        get("archive","q=mediatype%3Amovies%20AND%20collection%3Afeature_films%20AND%20downloads%3A%5B1%20TO%20*%5D&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=description&fl%5B%5D=date&rows=20&page=1&output=json"),
        fetch("/api/live").then(r=>{if(!r.ok)throw Error();return r.json()}),
        fetch("/api/hovod").then(r=>{if(!r.ok)throw Error();return r.json()})
      ]);

      const t=results[0].status==="fulfilled"?results[0].value:[];
      const a=results[1].status==="fulfilled"?results[1].value:{data:[]};
      const i=results[2].status==="fulfilled"?results[2].value:{response:{docs:[]}};
      const l=results[3].status==="fulfilled"?results[3].value:{channels:[]};
      const h=results[4].status==="fulfilled"?results[4].value:{videos:[]};

      const A=t.map(tv),B=(a.data||[]).map(anime),C=(i.response?.docs||[]).map(archive),L=(l.channels||[]).map(live).filter((x:Item)=>x.videoUrl);
      const H=(h.videos||[]).map((x:any):Item=>({
        id:"hovod-"+x.id,
        title:x.title,
        name:x.title,
        overview:x.description||"",
        poster:x.poster||null,
        year:x.year||"",
        source:"Hovod",
        videoUrl:x.embedUrl
      }));
      const availableRows:Record<string,Item[]>={
        "My Hovod Library":H,
        "Public Live TV":L.slice(0,30),
        "TV Discovery":A.slice(0,20),
        "Anime Spotlight":B,
        "Public Domain Movies":C
      };
      setRows(availableRows);
      setHero(H[0]||B[0]||A[0]||C[0]||null);
      setLoading(false);
    };
    load().catch(()=>setLoading(false))
  },[]);

  useEffect(()=>{
    if(!q.trim()){setResults([]);return}
    const z=setTimeout(()=>{
      Promise.all([
        get("tvmaze","/search/shows?q="+encodeURIComponent(q)),
        get("jikan","/anime?q="+encodeURIComponent(q)+"&limit=6")
      ])
        .then(([t,a])=>setResults(t.slice(0,6).map((x:any)=>tv(x.show)).concat(a.data.slice(0,6).map(anime))))
        .catch(()=>setResults([]));
    },350);
    return()=>clearTimeout(z)
  },[q]);

  const add=(m:Item)=>{if(!list.some(x=>x.id===m.id))setList(list.concat(m))};

  return <main className="min-h-screen bg-[#141414] pb-12">
    <nav className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-8 bg-gradient-to-b from-black/95 to-transparent px-5 md:px-10">
      <button onClick={()=>setBrowse("Home")} className="text-2xl font-black tracking-tight text-[#e50914]">STREAMFLIX</button>
      <div className="hidden items-center gap-6 text-sm md:flex">
        {["Home","TV Shows","Anime","Movies","Live TV","My List"].map(x=><button key={x} onClick={()=>setBrowse(x)} className={browse===x?"font-bold text-white":"text-zinc-300 hover:text-white"}>{x}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="relative hidden sm:block"><Search className="absolute left-3 top-2.5 h-4 w-4"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Titles, people, genres" className="w-56 border border-white/60 bg-black/70 py-2 pl-10 pr-3 text-sm outline-none"/></div>
        <button onClick={()=>setBrowse("My List")} className="text-sm font-semibold">My List</button>
      </div>
    </nav>

    {hero&&<header className="relative flex min-h-[680px] items-end overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,#7f1d1d,transparent_38%),linear-gradient(90deg,#141414_0%,rgba(20,20,20,.72)_38%,rgba(20,20,20,.18)_72%,#141414_100%)]"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"/>
      <div className="relative z-10 max-w-2xl px-6 pb-20 md:px-12">
        <div className="mb-4 text-xs font-bold uppercase tracking-[.35em] text-[#e50914]">STREAMFLIX ORIGINAL EXPERIENCE</div>
        <h1 className="text-5xl font-black leading-none md:text-7xl">{hero.title||hero.name}</h1>
        <p className="mt-5 line-clamp-3 text-base leading-7 text-zinc-200 md:text-lg">{hero.overview||"Discover movies, series, anime and live television."}</p>
        <div className="mt-7 flex gap-3"><button onClick={()=>play(hero)} className="flex items-center gap-2 rounded bg-white px-7 py-3 font-bold text-black hover:bg-zinc-200"><Play className="h-5 w-5 fill-current"/>Play</button><button onClick={()=>add(hero)} className="flex items-center gap-2 rounded bg-zinc-600/80 px-7 py-3 font-bold hover:bg-zinc-500"><Plus/>My List</button></div>
      </div>
    </header>}

    {loading&&!hero&&<div className="flex min-h-screen items-center justify-center text-zinc-400"><div className="text-center"><div className="mb-4 text-3xl font-black text-[#e50914]">STREAMFLIX</div><div>Loading your entertainment...</div></div></div>}

    {q&&<section className="relative z-30 mx-5 -mt-8 rounded bg-[#181818] p-5 shadow-2xl md:mx-10"><h3 className="mb-4 text-xl font-bold">Search results</h3>{results.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">{results.map(m=><button onClick={()=>play(m)} key={String(m.id)} className="text-left"><div className="aspect-[2/3] overflow-hidden rounded bg-zinc-800">{m.poster&&<img src={m.poster} className="h-full w-full object-cover" alt=""/></div><div className="mt-2 truncate text-sm font-semibold">{m.name||m.title}</div></button>)}</div>:<p className="text-zinc-500">No titles found.</p>}</section>}

    <div className="relative z-10 -mt-2 space-y-2 pt-2">
      {browse==="My List" ? <Row title="My List" items={list} onOpen={m=>m.videoUrl?setPlayer(m):play(m)}/> : Object.entries(rows).filter(([title])=>browse==="Home" || (browse==="TV Shows"&&title==="TV Discovery") || (browse==="Anime"&&title==="Anime Spotlight") || (browse==="Movies"&&title==="Public Domain Movies") || (browse==="Live TV"&&title==="Public Live TV")).map(([title,items])=><Row key={title} title={title} items={items} onOpen={m=>m.videoUrl?setPlayer(m):play(m)}/>)}
    </div>

