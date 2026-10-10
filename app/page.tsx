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
  imdbId?:string;
  genres?:string[];
  cast?:string[];
  directors?:string[];
  runtime?:string|null;
  contentRating?:string|null;
};

const SEARCH_CATEGORIES=[["All","all"],["Movies","movies"],["Anime","anime"],["TV Shows","tv"]] as const;
const MOVIE_GENRES=[["All",""],["Action","action"],["Comedy","comedy"],["Drama","drama"],["Horror","horror"],["Romance","romance"],["Sci-Fi","sci_fi"],["Thriller","thriller"]] as const;
const imdbItem=(x:any):Item=>({
  id:`imdb-${x.id}`,
  imdbId:String(x.id),
  title:String(x.name||"Untitled"),
  overview:String(x.description||""),
  poster:typeof x.poster==="string"&&x.poster!=="image_not_found"?x.poster:null,
  year:x.year?String(x.year):String(x.datePublished||"").slice(0,4),
  rating:Number(x.rating?.ratingValue||x.rating)||0,
  source:"PyMovieDb",
  genres:Array.isArray(x.genre)?x.genre:[],
  url:`/title/${encodeURIComponent(String(x.id))}`
});

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
  const[searchLoading,setSearchLoading]=useState(false);
  const[searchUnavailable,setSearchUnavailable]=useState<string[]>([]);
  const[searchError,setSearchError]=useState("");
  const[movieGenre,setMovieGenre]=useState("");
  const[movieShelfLoading,setMovieShelfLoading]=useState(false);
  const searchAbort=useRef<AbortController|null>(null);
  const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const[selected,setSelected]=useState<Item|null>(null);
  const[detailError,setDetailError]=useState("");
  const[list,setList]=useState<Item[]>([]);
  const [browse,setBrowse]=useState("Home");
  const [loading,setLoading]=useState(true);

  const get=async(s:string,p:string)=>{
    const r=await fetch("/api/catalog?source="+s+"&path="+encodeURIComponent(p));
    if(!r.ok)throw Error();
    return r.json();
  };

  const play=async(m:Item)=>{
    if(m.imdbId){
      void openDetails(m);
      return;
    }
    setSelected(m);
  };

  const openDetails=async(m:Item)=>{
    setSelected(m);
    setDetailError("");
    if(!m.imdbId)return;
    try{
      const response=await fetch("/api/imdb?id="+encodeURIComponent(m.imdbId));
      const data=await response.json();
      if(!response.ok || !data || (!data.name && !data.description && !data.poster && !data.url)){
        throw new Error(`IMDb metadata request failed (${response.status})`);
      }
      setSelected(current=>current?.id===m.id?{
        ...current,
        name:data.name||current.name,
        overview:data.description||current.overview,
        poster:data.poster||current.poster,
        rating:Number(data.rating?.ratingValue)||current.rating,
        year:(data.datePublished||"").slice(0,4)||current.year,
        genres:Array.isArray(data.genre)?data.genre:[],
        cast:Array.isArray(data.actor)?data.actor.map((person:any)=>person.name).filter(Boolean).slice(0,8):[],
        directors:Array.isArray(data.director)?data.director.map((person:any)=>person.name).filter(Boolean):[],
        runtime:data.duration||null,
        contentRating:data.contentRating||null,
        url:data.url?.startsWith("http")?data.url:current.url
      }:current);
    }catch(error){
      console.error("IMDb title details could not be loaded",error);
      setDetailError("IMDb details are temporarily unavailable. The metadata service is blocked or offline, but the rest of the catalog still works.");
    }
  };

  const runSearch=async(query:string,category:string)=>{
    if(query.trim().length<2)return;
    searchAbort.current?.abort();
    const controller=new AbortController();
    searchAbort.current=controller;
    setSearchLoading(true);
    setSearchError("");
    try{
      const params=new URLSearchParams({q:query.trim(),scope:category});
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
    const params=new URLSearchParams({popular:"movie"});
    if(movieGenre)params.set("genre",movieGenre);
    setMovieShelfLoading(true);
    fetch(`/api/imdb?${params}`)
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Popular movie list unavailable");
        const movies=Array.isArray(data.results)?data.results.map(imdbItem):[];
        setRows(current=>({...current,"Popular Movies":movies}));
        setHero(current=>current||movies[0]||null);
      })
      .catch(error=>{
        console.error("PyMovieDb popular movies could not be loaded",error);
        setRows(current=>({...current,"Popular Movies":[]}));
      })
      .finally(()=>setMovieShelfLoading(false));
  },[movieGenre]);

  useEffect(()=>{
    fetch("/api/imdb?popular=tv")
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Popular TV list unavailable");
        const shows=Array.isArray(data.results)?data.results.map(imdbItem):[];
        setRows(current=>({...current,"Popular TV":shows}));
      })
      .catch(error=>{
        console.error("PyMovieDb popular TV could not be loaded",error);
        setRows(current=>({...current,"Popular TV":[]}));
      });
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
    searchTimer.current=setTimeout(()=>void runSearch(query,searchCategory),350);
    return()=>{
      if(searchTimer.current)clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
    };
  },[q,searchCategory]);

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
        {["Home","Movies","TV Shows","Anime","My List"].map(x=><button key={x} onClick={()=>{setBrowse(x);setQ("")}} className={browse===x?"font-bold text-white":"text-zinc-300 hover:text-white"}>{x}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <form onSubmit={submitSearch} role="search" className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-zinc-300"/>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>{if(e.key==="Escape")setQ("")}}
            placeholder="Search movies, anime..."
            aria-label="Search movies, anime, and TV shows"
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
        <div className="mt-5 flex gap-3"><button onClick={()=>setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"><Film className="h-3.5 w-3.5"/>Explore</button><button onClick={()=>hero.imdbId?void openDetails(hero):setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30"><Plus className="h-3.5 w-3.5"/>More Info</button></div>
      </div>
    </header>}

    {loading&&!hero&&<div className="flex min-h-screen items-center justify-center text-zinc-400"><div className="text-center"><div className="mb-4 text-3xl font-black text-[#e50914]">STREAMIVIO</div><div>Loading your entertainment...</div></div></div>}

    {!q.trim()&&<div className="relative z-10 mx-auto max-w-[1700px] pt-5">
      {browse==="Movies"&&<div className="mb-5 flex flex-wrap items-center gap-2 px-4 md:px-12">
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
            || (browse==="Anime"&&title==="Anime Spotlight")
            || (browse==="Movies"&&title==="Popular Movies")
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
      <p className="mt-3 text-zinc-300">{selected.overview||"This title is available for discovery only. Streamivio does not provide playback until distribution rights are secured."}</p>
      {selected.directors&&selected.directors.length>0&&<p className="mt-3 text-sm text-zinc-400"><span className="text-zinc-200">Director:</span> {selected.directors.join(", ")}</p>}
      {selected.cast&&selected.cast.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Cast:</span> {selected.cast.join(", ")}</p>}
      {detailError&&<p role="status" className="mt-4 text-sm text-amber-300">{detailError}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        {selected.source==="Kitsu"&&/^one piece$/i.test((selected.title||selected.name||"").trim())&&<a href="/anime/one-piece" className="rounded bg-[#e50914] px-5 py-2 font-bold text-white hover:bg-red-700">Watch One Piece</a>}
        <button onClick={()=>setSelected(null)} className="rounded bg-zinc-700 px-5 py-2 font-bold">Close</button>
      </div>
    </div></div>}
  </main>
}
