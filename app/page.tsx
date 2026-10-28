"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import {Search,Play,Plus,Film,X,LoaderCircle} from "lucide-react";

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
  video_url?:string|null;
  playback_available?:boolean;
  imdbId?:string;
  genres?:string[];
  country?:string[];
  ageRating?:string|null;
  platforms?:string[];
  developer?:string|null;
  publisher?:string|null;
  cast?:string[];
  directors?:string[];
  runtime?:string|null;
  contentRating?:string|null;
};

const SEARCH_CATEGORIES=[["All","all"],["Movies","movies"],["TV Shows","tv"],["Anime","anime"],["Documentaries","documentaries"],["Kids & Family","kids"],["Reality","reality"]] as const;
const MOVIE_GENRES=[["All",""],["Action","action"],["Comedy","comedy"],["Drama","drama"],["Horror","horror"],["Romance","romance"],["Sci-Fi","sci_fi"],["Thriller","thriller"]] as const;
function Row({title,items,onOpen}:{title:string;items:Item[];onOpen:(m:Item)=>void}){
  if(items.length===0)return null;
  return <section className="mb-7">
    <div className="mb-3 flex items-center justify-between px-4 md:px-12">
      <h2 className="text-sm font-bold md:text-base">{title}</h2>
      <span className="text-[10px] text-zinc-500">{items.length} titles</span>
    </div>
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-5 md:gap-3 md:px-12">
      {items.map(m=><button key={String(m.id)} onClick={()=>onOpen(m)} className="catalog-card group min-w-[31vw] text-left sm:min-w-[19vw] md:min-w-[14vw] lg:min-w-[12vw]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-900">
          {m.poster?<img src={m.poster} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" alt={m.title||m.name||""}/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"><Film className="h-12 w-12 text-zinc-700"/></div>}
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"/>
          <span className="absolute bottom-2 left-2 right-2 truncate text-xs font-bold drop-shadow md:bottom-3 md:left-3 md:text-sm">{m.title||m.name}</span>
          <span className="poster-play absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><span className="rounded-full border border-white/80 bg-black/60 p-2"><Play className="h-4 w-4 fill-white"/></span></span>
        </div>
        <div className="mt-1 truncate text-[10px] text-zinc-400">{m.year||m.source}{m.rating?" · ★ "+m.rating.toFixed(1):""}</div>
      </button>)}
    </div>
  </section>
}

export default function Home(){
  const[rows,setRows]=useState<Record<string,Item[]>>({});
  const[hero,setHero]=useState<Item|null>(null);
  const[q,setQ]=useState("");
  const[results,setResults]=useState<Item[]>([]);
  const[searchCategory,setSearchCategory]=useState("all");
  const[searchCountry,setSearchCountry]=useState("");
  const[searchYear,setSearchYear]=useState("");
  const[searchAgeRating,setSearchAgeRating]=useState("");
  const[searchLoading,setSearchLoading]=useState(false);
  const[searchUnavailable,setSearchUnavailable]=useState<string[]>([]);
  const[searchError,setSearchError]=useState("");
  const[movieGenre,setMovieGenre]=useState("");
  const[movieShelfLoading,setMovieShelfLoading]=useState(false);
  const searchAbort=useRef<AbortController|null>(null);
  const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const[selected,setSelected]=useState<Item|null>(null);
  const[detailError,setDetailError]=useState("");
  const[playbackUrl,setPlaybackUrl]=useState("");
  const[playbackFormat,setPlaybackFormat]=useState("");
  const[playbackLoading,setPlaybackLoading]=useState(false);
  const[playbackError,setPlaybackError]=useState("");
  const[list,setList]=useState<Item[]>([]);
  const [browse,setBrowse]=useState("Home");
  const [loading,setLoading]=useState(true);

  const get=async(s:string,p:string)=>{
    const r=await fetch("/api/catalog?source="+s+"&path="+encodeURIComponent(p));
    if(!r.ok)throw Error();
    return r.json();
  };

  const play=(m:Item)=>{setSelected(m);setPlaybackUrl("");setPlaybackFormat("");setPlaybackError("");setDetailError("");};
  const startPlayback=async()=>{
    if(!selected)return;
    setPlaybackLoading(true);setPlaybackError("");setPlaybackUrl("");
    try{
      const response=await fetch("/playback?id="+encodeURIComponent(String(selected.id)),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok||!data.available||!data.stream_url)throw new Error(data.message||data.error||"This title has no playable, authorized video configured yet.");
      setPlaybackUrl(data.stream_url);setPlaybackFormat(data.format||"external");
    }catch(error){setPlaybackError(error instanceof Error?error.message:"Playback is unavailable right now.");}
    finally{setPlaybackLoading(false);}
  };

  const runSearch=async(query:string,category:string,country=searchCountry,year=searchYear,ageRating=searchAgeRating)=>{
    if(query.trim().length<2)return;
    searchAbort.current?.abort();
    const controller=new AbortController();
    searchAbort.current=controller;
    setSearchLoading(true);
    setSearchError("");
    try{
      const params=new URLSearchParams({q:query.trim(),scope:category});
      if(country.trim())params.set("country",country.trim());
      if(year.trim())params.set("year",year.trim());
      if(ageRating)params.set("age_rating",ageRating);
      const response=await fetch(`/api/search?${params}`,{signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Search failed");
      setResults(Array.isArray(data.results)?data.results:[]);
      setSearchUnavailable(Array.isArray(data.unavailable)?data.unavailable:[]);
    }catch(error){
      if(error instanceof Error&&error.name==="AbortError")return;
      console.error("Catalog search failed",error);
      setResults([]);
      setSearchError("Search is temporarily unavailable. Please try again.");
    }finally{
      if(searchAbort.current===controller){
        searchAbort.current=null;
        setSearchLoading(false);
      }
    }
  };

  useEffect(()=>{
    fetch("/api/search?scope=anime&popular=1")
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Anime catalog unavailable");
        const anime=(Array.isArray(data.results)?data.results:[]).map((x:any):Item=>({...x,name:x.title,source:x.source||"Anime"}));
        setRows(current=>({...current,"Anime Spotlight":anime}));
      })
      .catch(error=>console.error("Anime catalog could not be loaded",error))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    const params=new URLSearchParams({scope:"movies",popular:"1"});
    if(movieGenre)params.set("genre",movieGenre);
    setMovieShelfLoading(true);
    fetch("/api/search?"+params.toString())
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Local movie catalog unavailable");
        const movies=Array.isArray(data.results)?data.results as Item[]:[];
        setRows(current=>({...current,"Popular Movies":movies}));
        setHero(current=>current||movies[0]||null);
      })
      .catch(error=>console.error("Local movie catalog could not be loaded",error))
      .finally(()=>setMovieShelfLoading(false));
  },[movieGenre]);

  useEffect(()=>{
    setGamesLoading(true);
    fetch("/api/games?popular=1")
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Games catalog unavailable");const games=Array.isArray(data.results)?data.results as Item[]:[];setRows(current=>({...current,"Games Spotlight":games}));})
      .catch(error=>console.error("Games catalog could not be loaded",error))
      .finally(()=>setGamesLoading(false));
  },[]);

  useEffect(()=>{
    const shelves=[["tv","Popular TV"],["documentaries","Documentaries"],["kids","Family & Kids"],["reality","Reality & Competition"]];
    Promise.all(shelves.map(async ([scope,title])=>{
      const response=await fetch("/api/search?scope="+scope+"&popular=1");
      if(!response.ok)throw new Error("Local "+scope+" catalog unavailable");
      const data=await response.json();
      const items=Array.isArray(data.results)?data.results as Item[]:[];
      setRows(current=>({...current,[title]:items}));
    })).catch(error=>console.error("Some local catalog shelves could not be loaded",error));
  },[]);

  useEffect(()=>{
    const query=q.trim();
    searchAbort.current?.abort();
    if(query.length<2){
      setResults([]);
      setSearchUnavailable([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }
    setResults([]);
    setSearchUnavailable([]);
    setSearchError("");
    setSearchLoading(true);
    searchTimer.current=setTimeout(()=>void runSearch(query,searchCategory,searchCountry,searchYear,searchAgeRating),350);
    return()=>{
      if(searchTimer.current)clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
    };
  },[q,searchCategory,searchCountry,searchYear,searchAgeRating]);

  const submitSearch=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(searchTimer.current)clearTimeout(searchTimer.current);
    void runSearch(q,searchCategory);
  };

  const add=(m:Item)=>{if(!list.some(x=>x.id===m.id))setList(list.concat(m))};

  return <main className="min-h-screen bg-[#141414] pb-12">
    <nav className="site-nav fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-5 px-4 md:gap-8 md:px-12">
      <button onClick={()=>setBrowse("Home")} className="shrink-0 text-xl font-black tracking-[-.06em] text-[#e50914] sm:text-2xl">STREAMIVIO</button>
      <div className="hidden items-center gap-5 text-sm md:flex">
        {["Home","Movies","TV Shows","Documentaries","Kids & Family","Reality","Anime","Games","My List"].map(x=><button key={x} onClick={()=>{setBrowse(x);setQ("")}} className={browse===x?"font-bold text-white":"text-zinc-300 hover:text-white"}>{x}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <form onSubmit={submitSearch} role="search" className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-zinc-300"/>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>{if(e.key==="Escape")setQ("")}}
            placeholder="Search movies, shows, docs, anime..."
            aria-label="Search movies, TV, documentaries, kids shows, reality and anime"
            autoComplete="off"
            maxLength={100}
            className="w-36 border border-white/20 bg-black/40 py-2 pl-7 pr-8 text-xs outline-none transition placeholder:text-zinc-400 focus:w-56 focus:border-white sm:w-48"
          />
          {q&&<button type="button" onClick={()=>setQ("")} aria-label="Clear search" className="absolute right-2 text-zinc-400 hover:text-white"><X className="h-3.5 w-3.5"/></button>}
        </form>
        <button onClick={()=>{setBrowse("My List");setQ("")}} className="hidden text-xs font-semibold sm:block">My List</button>
        <a href="/subscribe" aria-label="Open Streamivio subscription plans" className="rounded bg-[#e50914] px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:text-sm">Subscribe</a>
      </div>
    </nav>

    {q.trim()&&<section className="relative mx-4 mt-16 min-h-[55vh] rounded-xl bg-[#181818] p-5 sm:mx-6 md:mx-9 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Search</h2>
          <p className="mt-1 text-sm text-zinc-400">Movies, anime, and TV shows for “{q.trim()}”</p>
        </div>
        {searchLoading&&<span role="status" className="flex items-center gap-2 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin"/>Searching...</span>}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Search categories">
        {SEARCH_CATEGORIES.map(([label,value])=><button
          key={value}
          type="button"
          onClick={()=>setSearchCategory(value)}
          aria-pressed={searchCategory===value}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${searchCategory===value?"bg-white text-black":"bg-white/10 text-zinc-300 hover:bg-white/20"}`}
        >{label}</button>)}
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Country
          <input value={searchCountry} onChange={e=>setSearchCountry(e.target.value)} placeholder="e.g. Japan, Kenya, USA" className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600"/>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Release year
          <input inputMode="numeric" value={searchYear} onChange={e=>setSearchYear(e.target.value.replace(/[^0-9]/g,"").slice(0,4))} placeholder="e.g. 2024" maxLength={4} className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600"/>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Age rating
          <select value={searchAgeRating} onChange={e=>setSearchAgeRating(e.target.value)} className="rounded border border-white/15 bg-[#181818] px-3 py-2 text-sm text-white">
            <option value="">Any rating</option><option>G</option><option>PG</option><option>PG-13</option><option>R</option><option>TV-Y</option><option>TV-Y7</option><option>TV-G</option><option>TV-PG</option><option>TV-14</option><option>TV-MA</option><option>16+</option><option>18+</option>
          </select>
        </label>
      </div>
      {searchUnavailable.length>0&&<p role="status" className="mb-4 text-sm text-amber-300">Some sources are unavailable right now: {searchUnavailable.join(", ")}.</p>}
      {searchError&&<p role="alert" className="mb-4 text-sm text-amber-300">{searchError}</p>}
      {q.trim().length<2
        ? <p className="text-sm text-zinc-500">Type at least 2 characters to search.</p>
        : searchLoading&&results.length===0
          ? <p className="text-sm text-zinc-500">Looking across the selected catalogs...</p>
          : results.length>0
            ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{results.map(m=><button onClick={()=>void play(m)} key={String(m.id)} className="group min-w-0 text-left">
                <div className="relative aspect-[2/3] overflow-hidden rounded bg-zinc-900">
                  {m.poster?<img src={m.poster} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" alt={m.title||m.name||""}/>:<div className="flex h-full items-center justify-center"><Film className="h-10 w-10 text-zinc-700"/></div>}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
                  <span className="absolute bottom-2 left-2 right-2 truncate text-xs font-bold">{m.title||m.name}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold">{m.title||m.name}</div>
                <div className="text-xs text-zinc-400">{m.source}{m.year?` · ${m.year}`:""}{m.rating?` · ★ ${m.rating.toFixed(1)}`:""}</div>
              </button>)}</div>
            : searchUnavailable.length>0
              ? <p className="text-sm text-zinc-500">No matches were returned because one or more selected sources are unavailable. Try again later.</p>
              : <p className="text-sm text-zinc-500">No matches found. Try a different title or category.</p>}
    </section>}

    {!q.trim()&&hero&&<header className="hero-shell relative mt-16 overflow-hidden">
      <div className="hero-art absolute inset-0">{hero.poster&&<img src={hero.poster} alt="" className="h-full w-full object-cover"/>}</div>
      <div className="hero-shade absolute inset-0"/>
      <div className="hero-content relative z-10 flex h-full max-w-2xl flex-col justify-end px-5 pb-10 pt-40 sm:px-8 sm:pb-12 md:px-12 md:pb-14">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.3em] text-red-300">Featured title</div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[.35em] text-zinc-200">Streamivio selection</div>
        <h1 className="max-w-xl text-4xl font-black leading-[.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl">{hero.title||hero.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-200 sm:text-xs"><span>{hero.source}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/><span>{hero.year}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/>HD</div>
        <p className="mt-2 max-w-md line-clamp-3 text-xs leading-5 text-zinc-100 drop-shadow sm:text-sm">{hero.overview||"Discover movies, series and anime."}</p>
        <div className="mt-5 flex gap-3"><button onClick={()=>setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"><Film className="h-3.5 w-3.5"/>Explore</button><button onClick={()=>setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30"><Plus className="h-3.5 w-3.5"/>More Info</button></div>
      </div>
    </header>}

    {loading&&!hero&&<div className="flex min-h-screen items-center justify-center text-zinc-400"><div className="text-center"><div className="mb-4 text-3xl font-black text-[#e50914]">STREAMIVIO</div><div>Loading your entertainment...</div></div></div>}

    {!q.trim()&&<div className="relative z-10 mx-auto max-w-[1700px] pt-5">
      {browse==="Games"&&gamesLoading&&<div className="mb-4 flex items-center gap-2 px-4 text-sm text-zinc-400 md:px-12"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading games from Supabase…</div>}\n      {browse==="Movies"&&<div className="mb-5 flex flex-wrap items-center gap-2 px-4 md:px-12">
        <span className="mr-1 text-xs text-zinc-400">Genre</span>
        {MOVIE_GENRES.map(([label,value])=><button
          key={value||"all"}
          type="button"
          onClick={()=>setMovieGenre(value)}
          aria-pressed={movieGenre===value}
          className={`rounded-full px-3 py-1.5 text-xs transition ${movieGenre===value?"bg-white text-black":"bg-white/10 text-zinc-300 hover:bg-white/20"}`}
        >{label}</button>)}
        {movieShelfLoading&&<LoaderCircle aria-label="Loading movies" className="h-4 w-4 animate-spin text-zinc-400"/>}
      </div>}
      {browse==="My List"
        ? <Row title="My List" items={list} onOpen={play}/>
        : Object.entries(rows)
          .filter(([title])=>browse==="Home"
            || (browse==="TV Shows"&&title==="Popular TV")
            || (browse==="Documentaries"&&title==="Documentaries")
            || (browse==="Kids & Family"&&title==="Family & Kids")
            || (browse==="Reality"&&title==="Reality & Competition")
            || (browse==="Anime"&&title==="Anime Spotlight")
            || (browse==="Movies"&&title==="Popular Movies")\n            || (browse==="Games"&&title==="Games Spotlight")
)
          .map(([title,items])=><Row key={title} title={title} items={items} onOpen={play}/>)}
    </div>}

    {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={()=>setSelected(null)}><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-[#181818] p-6" onClick={e=>e.stopPropagation()}>
      <div className="text-xs font-bold uppercase tracking-wider text-red-400">{selected.source}</div>
      <h2 className="mt-2 text-2xl font-bold">{selected.title||selected.name}</h2>
      {(selected.year||selected.rating||selected.contentRating||selected.runtime)&&<div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
        {selected.year&&<span>{selected.year}</span>}{selected.contentRating&&<span>{selected.contentRating}</span>}{selected.runtime&&<span>{selected.runtime}</span>}{selected.rating&&<span>★ {selected.rating.toFixed(1)}</span>}
      </div>}
      {selected.genres&&selected.genres.length>0&&<p className="mt-3 text-sm text-zinc-400">{selected.genres.join(" · ")}</p>}
      {selected.platforms&&selected.platforms.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Platforms:</span> {selected.platforms.join(", ")}</p>}
      {selected.developer&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Developer:</span> {selected.developer}</p>}
      {selected.publisher&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Publisher:</span> {selected.publisher}</p>}
      {selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-red-400 hover:text-red-300">Official game page ↗</a>}
      <p className="mt-3 text-zinc-300">{selected.overview||"This title is available for discovery only. Streamivio does not provide playback until distribution rights are secured."}</p>
      {selected.directors&&selected.directors.length>0&&<p className="mt-3 text-sm text-zinc-400"><span className="text-zinc-200">Director:</span> {selected.directors.join(", ")}</p>}
      {selected.cast&&selected.cast.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Cast:</span> {selected.cast.join(", ")}</p>}
      {detailError&&<p role="status" className="mt-4 text-sm text-amber-300">{detailError}</p>}
      {playbackUrl&&<div className="mt-5 overflow-hidden rounded-lg bg-black">
        {(playbackFormat==="mp4"||playbackFormat==="hls")?<video key={playbackUrl} controls autoPlay playsInline className="aspect-video w-full" src={playbackUrl}>Your browser cannot play this video format.</video>:<iframe title={"Player for "+(selected.title||selected.name||"selected title")} src={playbackUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="aspect-video w-full border-0"/>}
        <p className="px-3 py-2 text-xs text-zinc-400">If playback fails, the provider may block embedding or the URL may not be browser-compatible.</p>
      </div>}
      {playbackError&&<p role="status" className="mt-4 text-sm text-amber-300">{playbackError}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        
        <button onClick={()=>void startPlayback()} disabled={playbackLoading} className="flex items-center gap-2 rounded bg-[#e50914] px-5 py-2 font-bold disabled:opacity-60"><Play className="h-4 w-4 fill-current"/>{playbackLoading?"Checking stream…":playbackUrl?"Reload player":"Play"}</button>
        <button onClick={()=>setSelected(null)} className="rounded bg-zinc-700 px-5 py-2 font-bold">Close</button>
      </div>
    </div></div>}
  </main>
}
