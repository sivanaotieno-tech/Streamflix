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
  imdbId?:string;
  genres?:string[];
  runtime?:string|null;
  contentRating?:string|null;
};

const tv=(x:any):Item=>({id:"tv-"+x.id,name:x.name,overview:(x.summary||"").replace(/<[^>]*>/g,""),poster:x.image?.original||x.image?.medium,rating:x.rating?.average||0,year:(x.premiered||"").slice(0,4),source:"TVmaze",url:x.url});
const anime=(x:any):Item=>({id:"anime-"+x.mal_id,name:x.title,overview:x.synopsis||"",poster:x.images?.jpg?.large_image_url||x.images?.jpg?.image_url,rating:x.score||0,year:(x.aired?.from||"").slice(0,4),source:"Jikan",url:x.url});
const archive=(x:any):Item=>({id:"ia-"+x.identifier,title:x.title||x.identifier,overview:x.description?.replace(/<[^>]*>/g,"")||"Internet Archive movie",source:"Internet Archive",year:(x.date||"").slice(0,4),url:"https://archive.org/details/"+x.identifier});
const live=(x:any):Item=>({id:"live-"+x.id,title:x.name,overview:[x.country,x.language].filter(Boolean).join(" · "),poster:x.logo||null,source:"iptv-org",videoUrl:x.streams?.[0]?.url});
const imdbResult=(x:any):Item=>({id:"imdb-"+x.id,imdbId:x.id,name:x.name,poster:x.poster||null,source:"IMDb",url:x.url||`https://www.imdb.com/title/${x.id}/`});

function Row({title,items,onOpen}:{title:string;items:Item[];onOpen:(m:Item)=>void}){
  if(items.length===0)return null;
  return <section className="mb-7">
    <div className="mb-2 flex items-center justify-between px-5 md:px-9">
      <h2 className="text-sm font-bold md:text-base">{title}</h2>
      <span className="text-[10px] text-zinc-500">{items.length} titles</span>
    </div>
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pb-3 md:gap-3 md:px-9">
      {items.map(m=><button key={String(m.id)} onClick={()=>onOpen(m)} className="catalog-card group min-w-[38vw] text-left sm:min-w-[25vw] md:min-w-[18vw]">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
          {m.poster?<img src={m.poster} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" alt={m.title||m.name||""}/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">{m.source==="iptv-org"?<Radio className="h-12 w-12 text-zinc-700"/>:<Film className="h-12 w-12 text-zinc-700"/>}</div>}
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"/>
          <span className="absolute bottom-2 left-2 right-2 truncate text-xs font-bold drop-shadow md:bottom-3 md:left-3 md:text-sm">{m.title||m.name}</span>
          <span className="poster-play absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><span className="rounded-full border border-white/80 bg-black/60 p-2"><Play className="h-4 w-4 fill-white"/></span></span>
        </div>
        <div className="mt-1 truncate text-[10px] text-zinc-400">{m.year||m.source}{m.rating?" · ★ "+m.rating.toFixed(1):""}</div>
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
      {movie.source==="PeerTube" && movie.videoUrl ? (
        <iframe
          className="aspect-video w-full rounded-lg bg-black shadow-2xl"
          src={movie.videoUrl}
          title={movie.title||movie.name||"Streamivio video"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video className="w-full rounded-lg bg-black shadow-2xl" controls autoPlay playsInline preload="metadata" src={movie.videoUrl}/>
      )}
      <p className="mt-3 text-xs text-zinc-400">Streamivio uses the self-hosted PeerTube streaming API for your uploaded videos. Vercel does not proxy the video bytes.</p>
    </div>
  </div>
}

export default function Home(){
  const[rows,setRows]=useState<Record<string,Item[]>>({});
  const[hero,setHero]=useState<Item|null>(null);
  const[q,setQ]=useState("");
  const[results,setResults]=useState<Item[]>([]);
  const[imdbSearchUnavailable,setImdbSearchUnavailable]=useState(false);
  const[selected,setSelected]=useState<Item|null>(null);
  const[detailError,setDetailError]=useState("");
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
    if(m.source==="PeerTube" && m.videoUrl){setPlayer(m);return}
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

  const openDetails=async(m:Item)=>{
    setSelected(m);
    setDetailError("");
    if(!m.imdbId)return;
    try{
      const response=await fetch("/api/imdb?id="+encodeURIComponent(m.imdbId));
      if(!response.ok)throw new Error(`IMDb metadata request failed (${response.status})`);
      const data=await response.json();
      setSelected(current=>current?.id===m.id?{
        ...current,
        name:data.name||current.name,
        overview:data.description||current.overview,
        poster:data.poster||current.poster,
        rating:Number(data.rating?.ratingValue)||current.rating,
        year:(data.datePublished||"").slice(0,4)||current.year,
        genres:Array.isArray(data.genre)?data.genre:[],
        runtime:data.duration||null,
        contentRating:data.contentRating||null,
        url:data.url?.startsWith("http")?data.url:current.url
      }:current);
    }catch(error){
      console.error("IMDb title details could not be loaded",error);
      setDetailError("IMDb details could not be loaded. Check that the PyMovieDb service is running.");
    }
  };

  useEffect(()=>{
    const load=async()=>{
      const results=await Promise.allSettled([
        get("tvmaze","/shows?page=0"),
        get("jikan","/top/anime?filter=bypopularity&limit=20"),
        get("archive","q=mediatype%3Amovies%20AND%20collection%3Afeature_films%20AND%20downloads%3A%5B1%20TO%20*%5D&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=description&fl%5B%5D=date&rows=20&page=1&output=json"),
        fetch("/api/live").then(r=>{if(!r.ok)throw Error();return r.json()}),
        fetch("/api/peertube").then(r=>{if(!r.ok)throw Error();return r.json()})
      ]);

      const t=results[0].status==="fulfilled"?results[0].value:[];
      const a=results[1].status==="fulfilled"?results[1].value:{data:[]};
      const i=results[2].status==="fulfilled"?results[2].value:{response:{docs:[]}};
      const l=results[3].status==="fulfilled"?results[3].value:{channels:[]};
      const j=results[4].status==="fulfilled"?results[4].value:{videos:[]};

      const A=t.map(tv),B=(a.data||[]).map(anime),C=(i.response?.docs||[]).map(archive),L=(l.channels||[]).map(live).filter((x:Item)=>x.videoUrl);
      const J=(j.videos||[]).map((x:any):Item=>({
        id:"jellyfin-"+x.id,
        title:x.title,
        name:x.title,
        overview:x.overview||"",
        poster:x.poster||null,
        year:x.year||"",
        source:"PeerTube",
        videoUrl:x.streamUrl
      }));
      const availableRows:Record<string,Item[]>={
        "My PeerTube Library":J,
        "Public Live TV":L.slice(0,30),
        "TV Discovery":A.slice(0,20),
        "Anime Spotlight":B,
        "Public Domain Movies":C
      };
      setRows(availableRows);
      setHero(J[0]||B[0]||A[0]||C[0]||null);
      setLoading(false);
    };
    load().catch(()=>setLoading(false))
  },[]);

  useEffect(()=>{
    if(!q.trim()){setResults([]);return}
    const z=setTimeout(()=>{
      void Promise.allSettled([
        get("tvmaze","/search/shows?q="+encodeURIComponent(q)),
        get("jikan","/anime?q="+encodeURIComponent(q)+"&limit=6"),
        fetch("/api/imdb?q="+encodeURIComponent(q)).then(async response=>{
          if(!response.ok)throw new Error(`IMDb search failed (${response.status})`);
          return response.json();
        })
      ]).then(([tvResult,animeResult,imdbSearch])=>{
        const tvItems=tvResult.status==="fulfilled"?tvResult.value.slice(0,6).map((x:any)=>tv(x.show)):[];
        const animeItems=animeResult.status==="fulfilled"?animeResult.value.data.slice(0,6).map(anime):[];
        const imdbItems=imdbSearch.status==="fulfilled"?(imdbSearch.value.results||[]).slice(0,8).map(imdbResult):[];
        setImdbSearchUnavailable(imdbSearch.status==="rejected");
        setResults([...imdbItems,...tvItems,...animeItems]);
      });
    },350);
    return()=>clearTimeout(z)
  },[q]);

  const add=(m:Item)=>{if(!list.some(x=>x.id===m.id))setList(list.concat(m))};

  return <main className="min-h-screen bg-[#141414] pb-12">
    <nav className="site-nav fixed left-0 right-0 top-0 z-40 flex h-12 items-center gap-5 px-5 md:gap-7 md:px-9">
      <button onClick={()=>setBrowse("Home")} className="shrink-0 text-lg font-black tracking-tight text-[#e50914]">STREAMIVIO</button>
      <div className="hidden items-center gap-4 text-xs md:flex">
        {["Home","TV Shows","Anime","Movies","Live TV","My List"].map(x=><button key={x} onClick={()=>setBrowse(x)} className={browse===x?"font-bold text-white":"text-zinc-300 hover:text-white"}>{x}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <label className="relative flex items-center"><Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-zinc-300"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search" aria-label="Search titles" className="w-24 border border-transparent bg-transparent py-1 pl-7 pr-1 text-xs outline-none transition placeholder:text-zinc-400 focus:w-40 focus:border-white sm:w-32"/></label>
        <button onClick={()=>setBrowse("My List")} className="hidden text-xs font-semibold sm:block">My List</button>
      </div>
    </nav>

    {hero&&<header className="hero-shell relative mx-4 mt-14 overflow-hidden rounded-xl sm:mx-6 md:mx-9">
      <div className="hero-art absolute inset-0">{hero.poster&&<img src={hero.poster} alt="" className="h-full w-full object-cover"/>}</div>
      <div className="hero-shade absolute inset-0"/>
      <div className="hero-content relative z-10 flex h-full max-w-xl flex-col justify-end px-5 pb-7 pt-40 sm:px-7 sm:pb-9 md:px-9 md:pb-10">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.3em] text-red-300">Featured title</div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[.35em] text-zinc-200">Streamivio selection</div>
        <h1 className="max-w-xl text-4xl font-black leading-[.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl">{hero.title||hero.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-200 sm:text-xs"><span>{hero.source}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/><span>{hero.year}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/>HD</div>
        <p className="mt-2 max-w-md line-clamp-3 text-xs leading-5 text-zinc-100 drop-shadow sm:text-sm">{hero.overview||"Discover movies, series, anime and live television."}</p>
        <div className="mt-4 flex gap-2"><button onClick={()=>play(hero)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"><Play className="h-3.5 w-3.5 fill-current"/>Play</button><button onClick={()=>hero.imdbId?void openDetails(hero):setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30"><Plus className="h-3.5 w-3.5"/>More Info</button></div>
      </div>
    </header>}

    {loading&&!hero&&<div className="flex min-h-screen items-center justify-center text-zinc-400"><div className="text-center"><div className="mb-4 text-3xl font-black text-[#e50914]">STREAMIVIO</div><div>Loading your entertainment...</div></div></div>}

    {q&&<section className="relative z-30 mx-5 -mt-8 rounded bg-[#181818] p-5 shadow-2xl md:mx-10">
      <h3 className="mb-4 text-xl font-bold">Search results</h3>
      {imdbSearchUnavailable&&<p role="status" className="mb-3 text-xs text-amber-300">IMDb search is unavailable. Start the PyMovieDb service to enable IMDb results.</p>}
      {results.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">{results.map(m=><button onClick={()=>m.imdbId?void openDetails(m):void play(m)} key={String(m.id)} className="text-left"><div className="aspect-[2/3] overflow-hidden rounded bg-zinc-800">{m.poster&&<img src={m.poster} className="h-full w-full object-cover" alt={m.name||m.title||""}/>}</div><div className="mt-2 truncate text-sm font-semibold">{m.name||m.title}</div><div className="text-xs text-zinc-400">{m.source}</div></button>)}</div>:<p className="text-zinc-500">No titles found.</p>}
    </section>}

    <div className="relative z-10 mx-auto max-w-[1500px] pt-5">
      {browse==="My List" ? <Row title="My List" items={list} onOpen={m=>m.videoUrl?setPlayer(m):play(m)}/> : Object.entries(rows).filter(([title])=>browse==="Home" || (browse==="TV Shows"&&title==="TV Discovery") || (browse==="Anime"&&title==="Anime Spotlight") || (browse==="Movies"&&title==="Public Domain Movies") || (browse==="Live TV"&&title==="Public Live TV")).map(([title,items])=><Row key={title} title={title} items={items} onOpen={m=>m.videoUrl?setPlayer(m):play(m)}/>)}
    </div>

    {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={()=>setSelected(null)}><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-[#181818] p-6" onClick={e=>e.stopPropagation()}>
      <div className="text-xs font-bold uppercase tracking-wider text-red-400">{selected.source}</div>
      <h2 className="mt-2 text-2xl font-bold">{selected.title||selected.name}</h2>
      {(selected.year||selected.rating||selected.contentRating||selected.runtime)&&<div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
        {selected.year&&<span>{selected.year}</span>}{selected.contentRating&&<span>{selected.contentRating}</span>}{selected.runtime&&<span>{selected.runtime}</span>}{selected.rating&&<span>★ {selected.rating.toFixed(1)}</span>}
      </div>}
      {selected.genres&&selected.genres.length>0&&<p className="mt-3 text-sm text-zinc-400">{selected.genres.join(" · ")}</p>}
      <p className="mt-3 text-zinc-300">{selected.overview||"This title does not currently expose a browser-playable stream."}</p>
      {detailError&&<p role="status" className="mt-4 text-sm text-amber-300">{detailError}</p>}
      <div className="mt-5 flex gap-3">
        <button onClick={()=>setSelected(null)} className="rounded bg-zinc-700 px-5 py-2 font-bold">Close</button>
        {selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="rounded bg-white px-5 py-2 font-bold text-black">{selected.source==="IMDb"?"View on IMDb":"Open Source"}</a>}
      </div>
    </div></div>}
    {player&&<Player movie={player} onClose={()=>setPlayer(null)}/>}
  </main>
}
