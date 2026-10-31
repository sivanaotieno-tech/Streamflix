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
  imdb_id?:string;
  imdbID?:string;
  tmdbId?:string|number;
  tmdb_id?:string|number;
  media_type?:string;
  type?:string;
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

const SEARCH_CATEGORIES=[["All","all"],["Movies","movies"],["TV Shows","tv"],["Anime","anime"],["Documentaries","documentaries"],["Kids & Family","kids"],["Reality","reality"],["Games","games"]] as const;

const isTvItem=(item:Item|null)=>{
  const type=String(item?.type||item?.media_type||"").toLowerCase();
  const source=String(item?.source||"").toLowerCase();
  return ["tv","tvshow","tv show","series","anime","documentary","documentaries","kids","reality"].includes(type)||source.includes("tv show");
};
const isGameItem=(item:Item|null)=>String(item?.type||"").toLowerCase()==="game"||String(item?.id||"").startsWith("game-");
const getIdFromEmbedUrl=(value:string)=>{
  try{
    const parts=new URL(value).pathname.split("/").filter(Boolean);
    const index=parts.findIndex(part=>part==="movie"||part==="tv");
    return index>=0?parts[index+1]||"": "";
  }catch{return "";}
};
const progressKeyFor=(id:string)=>"streamivio:vidsrc-progress:"+id.toLowerCase();
const formatSeconds=(value:number)=>{
  const total=Math.max(0,Math.floor(Number.isFinite(value)?value:0));
  return Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
};

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
  const[searchSort,setSearchSort]=useState("relevance");
  const[searchTotal,setSearchTotal]=useState(0);
  const[searchSources,setSearchSources]=useState<string[]>([]);
  const[searchLoading,setSearchLoading]=useState(false);
  const[searchUnavailable,setSearchUnavailable]=useState<string[]>([]);
  const[searchFiltersOpen,setSearchFiltersOpen]=useState(false);
  const[searchError,setSearchError]=useState("");
  const[movieGenre,setMovieGenre]=useState("");
  const[movieShelfLoading,setMovieShelfLoading]=useState(false);
  const[gamesLoading,setGamesLoading]=useState(true);
  const searchAbort=useRef<AbortController|null>(null);
  const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const[selected,setSelected]=useState<Item|null>(null);
  const[titleDetails,setTitleDetails]=useState<any|null>(null);
  const[titleDetailsLoading,setTitleDetailsLoading]=useState(false);
  const[titleDetailsMessage,setTitleDetailsMessage]=useState("");
  const[titleDetailsMetadataAvailable,setTitleDetailsMetadataAvailable]=useState(false);
  const[titleDetailsError,setTitleDetailsError]=useState("");
  const[detailError,setDetailError]=useState("");
  const[playbackUrl,setPlaybackUrl]=useState("");
  const[playbackFormat,setPlaybackFormat]=useState("");
  const[playbackLoading,setPlaybackLoading]=useState(false);
  const[playbackError,setPlaybackError]=useState("");
  const[vidsrcOptionsOpen,setVidSrcOptionsOpen]=useState(false);
  const[subtitleLanguage,setSubtitleLanguage]=useState("en");
  const[autoplay,setAutoplay]=useState(false);
  const[autoNext,setAutoNext]=useState(false);
  const[season,setSeason]=useState("");
  const[episode,setEpisode]=useState("");
  const[customSubtitleUrl,setCustomSubtitleUrl]=useState("");
  const[customSubtitleLabel,setCustomSubtitleLabel]=useState("Custom subtitle");
  const[customSubtitleLang,setCustomSubtitleLang]=useState("en");
  const[startAt,setStartAt]=useState("");
  const[playerContentId,setPlayerContentId]=useState("");
  const[resumeSeconds,setResumeSeconds]=useState(0);
  const[pendingDirectResume,setPendingDirectResume]=useState(0);
  const[vidsrcInfo,setVidSrcInfo]=useState<any|null>(null);
  const[vidsrcInfoLoading,setVidSrcInfoLoading]=useState(false);
  const[vidsrcInfoError,setVidSrcInfoError]=useState("");
  const playerIframeRef=useRef<HTMLIFrameElement|null>(null);
  const[list,setList]=useState<Item[]>([]);
  const [browse,setBrowse]=useState("Home");
  const [loading,setLoading]=useState(true);
  const [authUser,setAuthUser]=useState<{email:string}|null>(null);
  const [authStatusLoading,setAuthStatusLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/auth/me",{cache:"no-store"})
      .then(async response=>{
        const data=await response.json().catch(()=>({}));
        if(!cancelled&&response.ok&&data.authenticated&&data.user?.email)setAuthUser({email:String(data.user.email)});
      })
      .catch(()=>{})
      .finally(()=>{if(!cancelled)setAuthStatusLoading(false);});
    return()=>{cancelled=true;};
  },[]);

  const signOut=async()=>{
    try{await fetch("/api/auth/signout",{method:"POST",cache:"no-store"});}catch{}
    setAuthUser(null);
  };

  const get=async(s:string,p:string)=>{
    const r=await fetch("/api/catalog?source="+s+"&path="+encodeURIComponent(p));
    if(!r.ok)throw Error();
    return r.json();
  };

  const play=(m:Item)=>{
    setSelected(m);setPlaybackUrl("");setPlaybackFormat("");setPlaybackError("");setDetailError("");
    setPlayerContentId("");setVidSrcInfo(null);setVidSrcInfoError("");setResumeSeconds(0);setPendingDirectResume(0);setStartAt("");
  };

  useEffect(()=>{
    if(!selected){
      setTitleDetails(null);setTitleDetailsLoading(false);setTitleDetailsMessage("");
      setTitleDetailsMetadataAvailable(false);setTitleDetailsError("");
      return;
    }
    const controller=new AbortController();
    const title=String(selected.title||selected.name||"");
    const params=new URLSearchParams({
      id:String(selected.id),
      title,
      type:String(selected.type||selected.media_type||(String(selected.id).startsWith("game-")?"game":"movie"))
    });
    const imdbId=String(selected.imdbId||selected.imdb_id||selected.imdbID||"");
    const tmdbId=String(selected.tmdbId||selected.tmdb_id||"");
    if(imdbId)params.set("imdb_id",imdbId);
    if(tmdbId)params.set("tmdb_id",tmdbId);
    setTitleDetails(null);setTitleDetailsLoading(true);setTitleDetailsMessage("");
    setTitleDetailsMetadataAvailable(false);setTitleDetailsError("");
    fetch("/api/title?"+params.toString(),{signal:controller.signal,cache:"no-store"})
      .then(async response=>{
        const payload=await response.json().catch(()=>({}));
        if(!response.ok||!payload.available||!payload.title){
          throw new Error(payload.message||payload.error||"Title details could not be loaded.");
        }
        setTitleDetails(payload.title);
        setTitleDetailsMessage(typeof payload.message==="string"?payload.message:"");
        setTitleDetailsMetadataAvailable(Boolean(payload.metadata_available));
      })
      .catch(error=>{
        if(error instanceof Error&&error.name==="AbortError")return;
        console.error("Title details could not be loaded",error);
        setTitleDetailsError("Extra title details are temporarily unavailable. Showing the information available in the Streamivio catalog.");
      })
      .finally(()=>{if(!controller.signal.aborted)setTitleDetailsLoading(false);});
    return()=>controller.abort();
  },[selected]);

  const buildVidSrcUrl=(baseUrl:string,contentId:string,kind:"movie"|"tv",resumeOverride?:number)=>{
    const url=new URL(baseUrl);
    if(url.origin!=="https://vidsrc.sh"||!url.pathname.startsWith("/embed/"))return baseUrl;
    if(!(/^tt\d{5,10}$/i.test(contentId)||/^\d{1,12}$/.test(contentId)))return baseUrl;

    if(kind==="tv"){
      const seasonNumber=season.trim()?Number(season):NaN;
      const episodeNumber=episode.trim()?Number(episode):NaN;
      url.pathname="/embed/tv/"+encodeURIComponent(contentId);
      if(Number.isInteger(seasonNumber)&&seasonNumber>0&&Number.isInteger(episodeNumber)&&episodeNumber>0){
        url.pathname+="/"+seasonNumber+"/"+episodeNumber;
      }
    }else{
      url.pathname="/embed/movie/"+encodeURIComponent(contentId);
    }
    url.search="";

    if(autoplay)url.searchParams.set("autoplay","1");
    if(kind==="tv"&&autoNext)url.searchParams.set("autonext","1");
    const lang=subtitleLanguage.trim();
    if(lang&&/^[a-z]{2,3}(,[a-z]{2,3}){0,2}$/i.test(lang))url.searchParams.set("ds_lang",lang);

    let saved=0;
    if(resumeOverride!==undefined)saved=resumeOverride;
    else if(startAt.trim())saved=Number(startAt);
    else{
      try{saved=Number(localStorage.getItem("streamivio:vidsrc-progress:"+contentId.toLowerCase())||0);}catch{saved=0;}
    }
    if(Number.isFinite(saved)&&saved>0)url.searchParams.set("startAt",String(Math.floor(saved)));

    if(customSubtitleUrl.trim()){
      const subtitleUrl=new URL(customSubtitleUrl.trim());
      if(subtitleUrl.protocol!=="https:")throw new Error("Custom subtitle files must use an HTTPS URL.");
      url.searchParams.set("sub_url",subtitleUrl.toString());
      if(customSubtitleLabel.trim())url.searchParams.set("sub_label",customSubtitleLabel.trim().slice(0,80));
      if(/^[a-z]{2,3}$/i.test(customSubtitleLang.trim()))url.searchParams.set("sub_lang",customSubtitleLang.trim());
    }
    return url.toString();
  };

  const startPlayback=async(resumeOverride?:number)=>{
    if(!selected)return;
    if(isGameItem(selected)){
      setPlaybackError("Games are listed for discovery, not streamed in Streamivio. Use the official game page above for platform and purchase information.");
      return;
    }
    setPlaybackLoading(true);setPlaybackError("");setPlaybackUrl("");
    setVidSrcInfo(null);setVidSrcInfoError("");
    const kind:"movie"|"tv"=isTvItem(selected)?"tv":"movie";
    const resolvedImdbId=String(selected.imdbId||selected.imdb_id||selected.imdbID||titleDetails?.imdbId||titleDetails?.imdb_id||titleDetails?.imdbID||"");
    const resolvedTmdbId=String(selected.tmdbId||selected.tmdb_id||titleDetails?.tmdbId||titleDetails?.tmdb_id||"");
    try{
      // Prefer authorized catalog URLs; otherwise ask the server to resolve a known title ID.
      const playbackParams=new URLSearchParams({id:String(selected.id),title:String(selected.title||selected.name||""),type:String(selected.type||selected.media_type||(isGameItem(selected)?"game":"movie")),imdb_id:resolvedImdbId,tmdb_id:resolvedTmdbId});
      if(kind==="tv"&&season.trim()&&episode.trim()){playbackParams.set("season",season);playbackParams.set("episode",episode);}
      if(autoplay)playbackParams.set("autoplay","1");
      if(kind==="tv"&&autoNext)playbackParams.set("autonext","1");
      if(subtitleLanguage.trim())playbackParams.set("ds_lang",subtitleLanguage.trim());
      if(startAt.trim())playbackParams.set("startAt",startAt.trim());
      const response=await fetch("/api/playback?"+playbackParams.toString(),{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(response.ok&&data.available&&typeof data.stream_url==="string"){
        const directProgressId=String(resolvedImdbId||resolvedTmdbId||selected.id);
        let initialStart=resumeOverride!==undefined?resumeOverride:(startAt.trim()?Number(startAt):0);
        if(!initialStart){
          try{initialStart=Number(localStorage.getItem(progressKeyFor(directProgressId))||0);}catch{initialStart=0;}
        }
        setPlayerContentId(directProgressId);
        setPendingDirectResume(Number.isFinite(initialStart)&&initialStart>0?initialStart:0);
        setPlaybackUrl(data.stream_url);setPlaybackFormat(data.format||"external");return;
      }
      if(response.ok&&data.available&&typeof data.embed_url==="string"){
        const contentId=String(data.content_id||data.imdb_id||data.tmdb_id||resolvedImdbId||resolvedTmdbId||getIdFromEmbedUrl(data.embed_url)||"");
        if(!contentId)throw new Error("The player URL did not include a valid IMDb or TMDB ID.");
        setPlayerContentId(contentId);
        if(Array.isArray(data.seasons))setVidSrcInfo(data);
        setPlaybackUrl(buildVidSrcUrl(data.embed_url,contentId,kind,resumeOverride));
        setPlaybackFormat("iframe");return;
      }

      if(!response.ok||!data.available){
        throw new Error(data.message||data.error||"The website playback resolver could not find a verified provider ID for this title.");
      }
      throw new Error("The playback resolver returned an unsupported response. Please try again.");
    }catch(error){
      setPlaybackError(error instanceof Error?error.message:"Playback is unavailable right now.");
    }finally{
      setPlaybackLoading(false);
    }
  };

  useEffect(()=>{
    if(playbackFormat!=="iframe"||!playerContentId||!selected){
      setVidSrcInfo(null);setVidSrcInfoError("");setVidSrcInfoLoading(false);return;
    }
    const controller=new AbortController();
    const kind=isTvItem(selected)?"tv":"movie";
    const params=new URLSearchParams({id:playerContentId,type:kind});
    if(kind==="tv"&&season.trim()&&episode.trim()){
      params.set("season",season);params.set("episode",episode);
    }
    setVidSrcInfoLoading(true);setVidSrcInfoError("");
    fetch("/api/playback/info?"+params.toString(),{signal:controller.signal,cache:"no-store"})
      .then(async response=>{
        const payload=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(payload.message||"VidSrc reports no information for this title.");
        setVidSrcInfo(payload);
      })
      .catch(error=>{
        if(error instanceof Error&&error.name==="AbortError")return;
        setVidSrcInfo(null);setVidSrcInfoError(error instanceof Error?error.message:"VidSrc information is unavailable.");
      })
      .finally(()=>setVidSrcInfoLoading(false));
    return()=>controller.abort();
  },[playbackFormat,playerContentId,selected,season,episode]);

  useEffect(()=>{
    if(!playerContentId)return;
    try{
      const saved=Number(localStorage.getItem(progressKeyFor(playerContentId))||0);
      setResumeSeconds(Number.isFinite(saved)&&saved>0?saved:0);
    }catch{setResumeSeconds(0);}
  },[playerContentId]);

  useEffect(()=>{
    const onPlayerMessage=(event:MessageEvent)=>{
      if(event.origin!=="https://vidsrc.sh")return;
      if(event.source!==playerIframeRef.current?.contentWindow)return;
      if(!event.data||event.data.type!=="PLAYER_EVENT"||!event.data.data||typeof event.data.data!=="object")return;
      if(!playerContentId)return;
      const data=event.data.data;
      const status=String(data.player_status||"");
      const progress=Number(data.player_progress);
      const duration=Number(data.player_duration);
      if(status==="completed"||(Number.isFinite(duration)&&duration>0&&Number.isFinite(progress)&&progress>=duration-2)){
        try{localStorage.removeItem(progressKeyFor(playerContentId));}catch{}
        setResumeSeconds(0);return;
      }
      if(!["playing","paused","seeked"].includes(status)||!Number.isFinite(progress)||progress<0)return;
      const seconds=Math.floor(progress);
      try{localStorage.setItem(progressKeyFor(playerContentId),String(seconds));}catch{}
      setResumeSeconds(seconds);
    };
    window.addEventListener("message",onPlayerMessage);
    return()=>window.removeEventListener("message",onPlayerMessage);
  },[playerContentId]);

  const runSearch=async(query:string,category:string,country=searchCountry,year=searchYear,ageRating=searchAgeRating,sort=searchSort)=>{
    if(query.trim().length<2){
      setResults([]);setSearchTotal(0);setSearchSources([]);
      return;
    }
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
      if(sort)params.set("sort",sort);
      const response=await fetch(`/api/search?${params}`,{signal:controller.signal,cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Search failed");
      const found=Array.isArray(data.results)?data.results:[];
      setResults(found);
      setSearchTotal(Number.isFinite(Number(data.total))?Math.max(0,Number(data.total)):found.length);
      setSearchSources(Array.isArray(data.sources)?data.sources.filter((source:any)=>typeof source==="string"):[]);
      setSearchUnavailable(Array.isArray(data.unavailable)?data.unavailable:[]);
    }catch(error){
      if(error instanceof Error&&error.name==="AbortError")return;
      console.error("Catalog search failed",error);
      setResults([]);
      setSearchTotal(0);setSearchSources([]);
      setSearchError("Search is temporarily unavailable. Check your connection or try again shortly.");
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
      setSearchTotal(0);setSearchSources([]);
      setSearchUnavailable([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }
    setResults([]);
    setSearchUnavailable([]);
    setSearchError("");
    setSearchLoading(true);
    searchTimer.current=setTimeout(()=>void runSearch(query,searchCategory,searchCountry,searchYear,searchAgeRating,searchSort),350);
    return()=>{
      if(searchTimer.current)clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
    };
  },[q,searchCategory,searchCountry,searchYear,searchAgeRating,searchSort]);

  const submitSearch=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(searchTimer.current)clearTimeout(searchTimer.current);
    void runSearch(q,searchCategory,searchCountry,searchYear,searchAgeRating,searchSort);
  };

  const add=(m:Item)=>{if(!list.some(x=>x.id===m.id))setList(list.concat(m))};
  const detailTitle=titleDetails||selected;

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
            placeholder="Search movies, shows, anime, games..."
            aria-label="Search movies, TV, documentaries, kids shows, reality, anime and games"
            autoComplete="off"
            maxLength={100}
            className="w-36 border border-white/20 bg-black/40 py-2 pl-7 pr-8 text-xs outline-none transition placeholder:text-zinc-400 focus:w-56 focus:border-white sm:w-48"
          />
          {q&&<button type="button" onClick={()=>setQ("")} aria-label="Clear search" className="absolute right-2 text-zinc-400 hover:text-white"><X className="h-3.5 w-3.5"/></button>}
        </form>
        <button onClick={()=>{setBrowse("My List");setQ("")}} className="hidden text-xs font-semibold sm:block">My List</button>
        {authUser ? <><span title={authUser.email} className="hidden max-w-28 truncate text-xs text-zinc-300 lg:block">{authUser.email}</span><button onClick={()=>void signOut()} className="text-xs font-semibold text-zinc-300 hover:text-white">Sign out</button></> : <a href="/sign-in" className="whitespace-nowrap text-xs font-semibold text-zinc-200 hover:text-white">{authStatusLoading?"Checking…":"Sign in"}</a>}
        <a href="/subscribe" aria-label="Open Streamivio subscription plans" className="rounded bg-[#e50914] px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:text-sm">Subscribe</a>
      </div>
    </nav>

    {q.trim()&&<section className="relative mx-4 mt-16 min-h-[55vh] rounded-xl bg-[#181818] p-5 sm:mx-6 md:mx-9 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Search</h2>
          <p className="mt-1 text-sm text-zinc-400">Searching {SEARCH_CATEGORIES.find(([,value])=>value===searchCategory)?.[0]||"all categories"} for “{q.trim()}”</p>
        </div>
        <div className="flex items-center gap-3">{searchLoading&&<span role="status" className="flex items-center gap-2 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin"/>Searching...</span>}<button type="button" onClick={()=>setSearchFiltersOpen(open=>!open)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10">{searchFiltersOpen?"Hide filters":"Filters"}</button></div>
      </div>
      {searchFiltersOpen&&<>
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Search categories">
        {SEARCH_CATEGORIES.map(([label,value])=><button
          key={value}
          type="button"
          onClick={()=>setSearchCategory(value)}
          aria-pressed={searchCategory===value}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${searchCategory===value?"bg-white text-black":"bg-white/10 text-zinc-300 hover:bg-white/20"}`}
        >{label}</button>)}
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <label className="flex flex-col gap-1 text-xs text-zinc-400">Sort results
          <select value={searchSort} onChange={e=>setSearchSort(e.target.value)} className="rounded border border-white/15 bg-[#181818] px-3 py-2 text-sm text-white">
            <option value="relevance">Best match</option><option value="rating">Top rated</option><option value="year">Newest first</option><option value="title">Title A–Z</option>
          </select>
        </label>
      </div>
      </>}
      {searchUnavailable.length>0&&<p role="status" className="mb-4 text-sm text-amber-300">Some search sources are unavailable: {searchUnavailable.join(", ")}. Showing results from the sources that responded.</p>}
      {searchError&&<p role="alert" className="mb-4 text-sm text-amber-300">{searchError}</p>}
      {!searchLoading&&results.length>0&&<p className="mb-3 text-xs text-zinc-500">{searchTotal} result{searchTotal===1?"":"s"} · Searched {searchSources.join(" and ")||"the available catalog"}.</p>}
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
              : <p className="text-sm text-zinc-500">No matches for “{q.trim()}”. Try fewer words, check the spelling, choose All, or remove a filter.</p>}
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
      {browse==="Games"&&gamesLoading&&<div className="mb-4 flex items-center gap-2 px-4 text-sm text-zinc-400 md:px-12"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading games from the local catalog…</div>}
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
            || (browse==="Documentaries"&&title==="Documentaries")
            || (browse==="Kids & Family"&&title==="Family & Kids")
            || (browse==="Reality"&&title==="Reality & Competition")
            || (browse==="Anime"&&title==="Anime Spotlight")
            || (browse==="Movies"&&title==="Popular Movies")
            || (browse==="Games"&&title==="Games Spotlight")
)
          .map(([title,items])=><Row key={title} title={title} items={items} onOpen={play}/>)}
    </div>}


    {selected&&playbackUrl&&<div className="fixed inset-0 z-[70] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Streamivio video player">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#111] px-4 sm:px-6">
        <div className="min-w-0 truncate text-sm font-semibold">{selected.title||selected.name||"Now playing"} <span className="ml-2 text-xs font-normal text-zinc-500">STREAMIVIO</span></div>
        <button type="button" onClick={()=>{setPlaybackUrl("");setPlaybackError("");}} className="ml-4 flex shrink-0 items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><X className="h-4 w-4"/>Back to details</button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        {(playbackFormat==="mp4"||playbackFormat==="hls")?<video key={playbackUrl} controls autoPlay playsInline className="h-full w-full object-contain" src={playbackUrl} onLoadedMetadata={e=>{const video=e.currentTarget;if(pendingDirectResume>0&&Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Math.min(pendingDirectResume,Math.max(0,video.duration-1));}} onTimeUpdate={e=>{if(!playerContentId)return;const video=e.currentTarget;const seconds=Number.isFinite(video.currentTime)?Math.floor(video.currentTime):0;setResumeSeconds(seconds);try{localStorage.setItem(progressKeyFor(playerContentId),String(seconds));}catch{}}} onEnded={()=>{if(playerContentId){try{localStorage.removeItem(progressKeyFor(playerContentId));}catch{}setResumeSeconds(0);setPendingDirectResume(0);}}}>Your browser cannot play this video format.</video>:<iframe ref={playerIframeRef} title={"Player for "+(selected.title||selected.name||"selected title")} src={playbackUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full border-0"/>}
      </div>
      <div className="shrink-0 border-t border-white/10 bg-[#111] px-4 py-2 text-center text-[11px] text-zinc-500">Playback is provided by the selected video source; availability can vary by title and region.</div>
    </div>}
    {selected&&!playbackUrl&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={()=>setSelected(null)}><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-[#181818] p-6" onClick={e=>e.stopPropagation()}>
      <div className="text-xs font-bold uppercase tracking-wider text-red-400">{detailTitle?.source||selected.source}</div>
      <h2 className="mt-2 text-2xl font-bold">{detailTitle?.title||detailTitle?.name||selected.title||selected.name}</h2>
      {(detailTitle?.year||detailTitle?.rating||detailTitle?.contentRating||detailTitle?.ageRating||detailTitle?.runtime)&&<div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
        {detailTitle?.year&&<span>{detailTitle.year}</span>}{(detailTitle?.contentRating||detailTitle?.ageRating)&&<span>{detailTitle.contentRating||detailTitle.ageRating}</span>}{detailTitle?.runtime&&<span>{detailTitle.runtime}</span>}{typeof detailTitle?.rating==="number"&&<span>★ {detailTitle.rating.toFixed(1)}</span>}
      </div>}
      {detailTitle?.genres&&detailTitle.genres.length>0&&<p className="mt-3 text-sm text-zinc-400">{detailTitle.genres.join(" · ")}</p>}
      {selected.platforms&&selected.platforms.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Platforms:</span> {selected.platforms.join(", ")}</p>}
      {selected.developer&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Developer:</span> {selected.developer}</p>}
      {selected.publisher&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Publisher:</span> {selected.publisher}</p>}
      {selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-red-400 hover:text-red-300">Official game page ↗</a>}
      {titleDetailsLoading&&<p role="status" className="mt-3 text-xs text-zinc-400"><LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin"/>Loading title details and credits…</p>}
      {titleDetailsMessage&&!titleDetailsLoading&&!titleDetailsMetadataAvailable&&<p className="mt-3 text-xs text-zinc-500">{titleDetailsMessage}</p>}
      {titleDetailsError&&<p role="status" className="mt-3 text-xs text-amber-300">{titleDetailsError}</p>}
      <p className="mt-3 leading-6 text-zinc-300">{detailTitle?.overview||detailTitle?.description||"A synopsis has not been added for this title yet. Check back later for more information."}</p>
      {detailTitle?.directors&&detailTitle.directors.length>0&&<p className="mt-3 text-sm text-zinc-400"><span className="text-zinc-200">Director:</span> {detailTitle.directors.join(", ")}</p>}
      {detailTitle?.cast&&detailTitle.cast.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Cast:</span> {detailTitle.cast.join(", ")}</p>}
      {detailError&&<p role="status" className="mt-4 text-sm text-amber-300">{detailError}</p>}
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20">
        <button type="button" onClick={()=>setVidSrcOptionsOpen(open=>!open)} aria-expanded={vidsrcOptionsOpen} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold">
          <span>VidSrc player settings</span><span className="text-xs text-zinc-400">{vidsrcOptionsOpen?"Hide options":"Subtitles, resume, episodes"}</span>
        </button>
        {vidsrcOptionsOpen&&<div className="grid gap-4 border-t border-white/10 p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-zinc-300">Subtitle language or priority list
            <input value={subtitleLanguage} onChange={e=>setSubtitleLanguage(e.target.value)} maxLength={11} placeholder="en or en,fr,de" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"/>
            <span className="text-[10px] text-zinc-500">Use ISO codes, e.g. en, fr, de. Leave blank for provider default.</span>
          </label>
          <label className="grid gap-1 text-xs text-zinc-300">Start time in seconds
            <input inputMode="numeric" type="number" min="0" value={startAt} onChange={e=>setStartAt(e.target.value)} placeholder={resumeSeconds>0?String(Math.floor(resumeSeconds)):"0"} className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"/>
          </label>
          {isTvItem(selected)&&<>
            <label className="grid gap-1 text-xs text-zinc-300">Season
              <select value={season} onChange={e=>{setSeason(e.target.value);setEpisode("");}} className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm">
                <option value="">Show season/episode picker</option>
                {(Array.isArray(vidsrcInfo?.seasons)?vidsrcInfo.seasons:[]).map((entry:any)=><option key={entry.season} value={String(entry.season)}>Season {entry.season}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-zinc-300">Episode
              <input inputMode="numeric" type="number" min="1" disabled={!season} value={episode} onChange={e=>setEpisode(e.target.value)} placeholder="Episode number" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50"/>
            </label>
          </>}
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={autoplay} onChange={e=>setAutoplay(e.target.checked)}/> Request autoplay after the provider's play gate</label>
          {isTvItem(selected)&&<label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={autoNext} onChange={e=>setAutoNext(e.target.checked)}/> Automatically play the next episode</label>}
          <div className="grid gap-2 sm:col-span-2">
            <label className="grid gap-1 text-xs text-zinc-300">Optional custom subtitle file (HTTPS .vtt or .srt)
              <input type="url" value={customSubtitleUrl} onChange={e=>setCustomSubtitleUrl(e.target.value)} placeholder="https://example.com/subtitles/en.vtt" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"/>
            </label>
            {customSubtitleUrl.trim()&&<div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-zinc-300">Subtitle label
                <input value={customSubtitleLabel} onChange={e=>setCustomSubtitleLabel(e.target.value)} maxLength={80} className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"/>
              </label>
              <label className="grid gap-1 text-xs text-zinc-300">Subtitle language code
                <input value={customSubtitleLang} onChange={e=>setCustomSubtitleLang(e.target.value)} maxLength={3} placeholder="en" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"/>
              </label>
            </div>}
            <p className="text-[11px] text-zinc-500">The subtitle host must allow browser CORS requests. Streamivio does not download the subtitle file.</p>
          </div>
        </div>}
      </div>
      {resumeSeconds>0&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2 text-xs text-zinc-300">
        <span>Saved playback position: {formatSeconds(resumeSeconds)}</span>
        <button type="button" onClick={()=>void startPlayback(resumeSeconds)} disabled={playbackLoading} className="rounded bg-zinc-700 px-3 py-1.5 font-semibold disabled:opacity-50">Resume</button>
      </div>}
      {isTvItem(selected)&&Array.isArray(vidsrcInfo?.seasons)&&<div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2"><label className="grid gap-1 text-xs text-zinc-300">Season<select value={season} onChange={e=>{setSeason(e.target.value);setEpisode("");}} className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"><option value="">Choose a season</option>{vidsrcInfo.seasons.map((entry:any)=><option key={entry.season} value={String(entry.season)}>Season {entry.season}</option>)}</select></label><label className="grid gap-1 text-xs text-zinc-300">Episode<input type="number" min="1" inputMode="numeric" disabled={!season} value={episode} onChange={e=>setEpisode(e.target.value)} placeholder="Episode number" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50"/></label><p className="text-[11px] text-zinc-500 sm:col-span-2">Choose a season and episode, then select Play to load that episode in the player.</p></div>}
      {vidsrcInfoLoading&&<p role="status" className="mt-3 text-xs text-zinc-400">Checking VidSrc availability and quality…</p>}
      {vidsrcInfo&&<div className="mt-3 rounded border border-white/10 px-3 py-2 text-xs text-zinc-300">
        <div className="flex flex-wrap gap-3"><span className="font-semibold text-emerald-300">VidSrc reports this title as available</span>{vidsrcInfo.quality&&<span>Best reported quality: {vidsrcInfo.quality}</span>}{vidsrcInfo.year&&<span>{vidsrcInfo.year}</span>}</div>
        {Array.isArray(vidsrcInfo.seasons)&&<p className="mt-1 text-zinc-400">{vidsrcInfo.seasons.length} season{vidsrcInfo.seasons.length===1?"":"s"} listed by the provider.</p>}
      </div>}
      {vidsrcInfoError&&<p role="status" className="mt-3 text-xs text-amber-300">{vidsrcInfoError}</p>}
      {playbackUrl&&<div className="mt-5 overflow-hidden rounded-lg bg-black">
        {(playbackFormat==="mp4"||playbackFormat==="hls")?<video key={playbackUrl} controls autoPlay playsInline className="aspect-video w-full" src={playbackUrl} onLoadedMetadata={e=>{const video=e.currentTarget;if(pendingDirectResume>0&&Number.isFinite(video.duration)&&video.duration>0){video.currentTime=Math.min(pendingDirectResume,Math.max(0,video.duration-1));}}} onTimeUpdate={e=>{if(!playerContentId)return;const video=e.currentTarget;const seconds=Number.isFinite(video.currentTime)?Math.floor(video.currentTime):0;setResumeSeconds(seconds);try{localStorage.setItem(progressKeyFor(playerContentId),String(seconds));}catch{}}} onEnded={()=>{if(playerContentId){try{localStorage.removeItem(progressKeyFor(playerContentId));}catch{}setResumeSeconds(0);setPendingDirectResume(0);}}}>Your browser cannot play this video format.</video>:<iframe ref={playerIframeRef} title={"Player for "+(selected.title||selected.name||"selected title")} src={playbackUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="aspect-video w-full border-0"/>}
        <p className="px-3 py-2 text-xs text-zinc-400">VidSrc quality controls and built-in subtitles are provided by the embedded player. Availability and playback can vary by title and region.</p>
      </div>}
      {playbackError&&<p role="status" className="mt-4 text-sm text-amber-300">{playbackError}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        
        {!isGameItem(selected)&&<button onClick={()=>void startPlayback()} disabled={playbackLoading} className="flex items-center gap-2 rounded bg-[#e50914] px-5 py-2 font-bold disabled:opacity-60"><Play className="h-4 w-4 fill-current"/>{playbackLoading?"Checking source…":playbackUrl?"Reload player":"Play"}</button>}
        {isGameItem(selected)&&<p className="self-center text-xs text-zinc-400">Game discovery only — Streamivio does not stream playable game builds.</p>}
        <button onClick={()=>setSelected(null)} className="rounded bg-zinc-700 px-5 py-2 font-bold">Close</button>
      </div>
    </div></div>}
  </main>
}
