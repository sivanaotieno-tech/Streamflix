"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import {Search,Play,Plus,Film,X,LoaderCircle,Home as HomeIcon,Compass,Clapperboard,Tv,Bookmark,Gamepad2,UserRound, CreditCard, Users, Trophy, FileVideo,BookOpen} from "lucide-react";
import {StreamivioLogo} from "@/components/streamivio-logo";
import {onAuthStateChanged,signOut as firebaseSignOut} from "firebase/auth";
import {firebaseAuth} from "@/lib/firebase-client";
import {OpeningScreen} from "@/components/opening-screen";
import {ImdbPoster} from "@/components/imdb-poster";

type Item={
  id:string|number;
  title?:string;
  name?:string;
  overview?:string;
  poster?:string|null;
  backdrop?:string|null;
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
  seasons?:any[];
  season_count?:number;
};

const SEARCH_CATEGORIES=[["All","all"],["Movies","movies"],["TV Shows","tv"],["Anime","anime"],["Documentaries","documentaries"],["Kids & Family","kids"],["Reality","reality"],["Games","games"]] as const;

const isTvItem=(item:Item|null)=>{
  const type=String(item?.type||item?.media_type||"").toLowerCase();
  const source=String(item?.source||"").toLowerCase();
  return ["tv","tvshow","tv show","series","anime","documentary","documentaries","kids","reality"].includes(type)||source.includes("tv show");
};
const isGameItem=(item:Item|null)=>String(item?.type||"").toLowerCase()==="game"||String(item?.id||"").startsWith("game-");
const getCanonicalTitleUrl=(item:Item)=>{
  const rawId=String(item.imdbId||item.imdb_id||item.imdbID||item.id||"");
  const id=rawId.startsWith("imdb-")?rawId.slice(5):rawId;
  return (isTvItem(item)?"/tv-show/":"/movie/")+encodeURIComponent(id);
};
const progressKeyFor=(id:string)=>"streamivio:playback-progress:"+id.toLowerCase();
type SkipRange={start:number;end:number};
type EpisodeSkipPoints={intro?:SkipRange;credits?:SkipRange};
const skipPointsKeyFor=(id:string,season:string,episode:string)=>"streamivio:skip-points:"+[id,season||"0",episode||"0"].join(":").toLowerCase();
const formatSeconds=(value:number)=>{
  const total=Math.max(0,Math.floor(Number.isFinite(value)?value:0));
  return Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
};


const DISCOVER_HOME_GROUPS={
"Blockbusters & franchises":["Marvel Cinematic Universe","DC","Fast & Furious","Mission: Impossible","John Wick","Transformers","Jurassic Park","Avatar","Star Wars","Planet of the Apes","The Hunger Games","Harry Potter","The Lord of the Rings","The Hobbit","Pirates of the Caribbean","James Bond","Indiana Jones","The Matrix","Rocky","Creed","Terminator","Alien","Predator","Godzilla","King Kong"],
"Animation & family":["Pixar","Disney Animation","DreamWorks Animation","Illumination","The LEGO Movies","Shrek","How to Train Your Dragon","Kung Fu Panda","Toy Story","Frozen","Moana","Zootopia","Inside Out","The Wild Robot","Spider-Verse","Despicable Me","SpongeBob"],
"Horror":["The Conjuring Universe","Insidious","Saw","Scream","Halloween","Friday the 13th","A Nightmare on Elm Street","Final Destination","Evil Dead","It","The Exorcist","Hereditary","M3GAN","Quiet Place","Resident Evil"],
"TV & drama":["Breaking Bad","Better Call Saul","The Last of Us","The Boys","Gen V","Invincible","Stranger Things","Wednesday","Fallout","The Walking Dead","Sherlock","Suits","Prison Break","Lost","House","Dexter","The Sopranos","The Wire","Succession","Severance","Black Mirror","The Bear","Cobra Kai","The Office","Brooklyn Nine-Nine","Friends","Modern Family","Doctor Who"],
"Anime":["One Piece","Naruto","Naruto Shippuden","Boruto","Bleach","Dragon Ball","Dragon Ball Z","Dragon Ball Super","Jujutsu Kaisen","Demon Slayer","Attack on Titan","My Hero Academia","Chainsaw Man","Spy x Family","Frieren","Hunter x Hunter","Fullmetal Alchemist: Brotherhood","Death Note","Solo Leveling","Mob Psycho 100","One Punch Man","Vinland Saga","Haikyuu!!","Blue Lock","Pokémon","Sailor Moon","JoJo's Bizarre Adventure"],
"International & documentaries":["Korean dramas","Chinese dramas","Indian cinema","African cinema","European cinema","Latin American cinema","Documentaries","Nature","Science","History","True crime","Reality TV","Stand-up comedy","Concert films","Short films","Classic cinema","Cult films","Award winners","Indie films"]
};
const MOVIE_GENRES=[["All",""],["Action","action"],["Comedy","comedy"],["Drama","drama"],["Horror","horror"],["Romance","romance"],["Sci-Fi","sci_fi"],["Thriller","thriller"]] as const;
function CatalogPoster({item,className,imageClassName}:{item:Item;className:string;imageClassName:string}){
  const [posterFailed,setPosterFailed]=useState(false);
  useEffect(()=>{setPosterFailed(false);},[item.poster,item.title,item.name]);
  return <div className={className+" relative overflow-hidden"}>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-red-950 via-zinc-900 to-black"/>
    {!item.poster||posterFailed?<ImdbPoster title={String(item.title||item.name||"")} year={String(item.year||"")} className={imageClassName+" absolute inset-0"}/>:<img src={item.poster} alt={String(item.title||item.name||"")} className={imageClassName+" absolute inset-0"} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setPosterFailed(true)}/>}
    {!item.poster||posterFailed?<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"/>:null}
  </div>;
}

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
          <CatalogPoster item={m} className="h-full w-full" imageClassName="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"/>
          <span className="absolute bottom-2 left-2 right-2 truncate text-xs font-bold drop-shadow md:bottom-3 md:left-3 md:text-sm">{m.title||m.name}</span>
          <span className="poster-play absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><span className="rounded-full border border-white/80 bg-black/60 p-2"><Play className="h-4 w-4 fill-white"/></span></span>
        </div>
        <div className="mt-1 truncate text-[10px] text-zinc-400">{m.year||m.source}{m.rating?" · ★ "+m.rating.toFixed(1):""}</div>
      </button>)}
    </div>
  </section>
}

function DoomsdayCountdown(){const target=new Date("2026-12-18T00:00:00Z").getTime();const [now,setNow]=useState(Date.now());useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);const diff=Math.max(0,target-now);const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,mins=Math.floor(diff/60000)%60,secs=Math.floor(diff/1000)%60;return <div className="mt-3"><div className="grid grid-cols-4 gap-2">{[["Days",days],["Hours",hours],["Mins",mins],["Secs",secs]].map(([label,val])=><div key={String(label)} className="rounded-xl bg-white/[.06] px-2 py-2 text-center"><div className="font-mono text-xl font-black text-purple-300 sm:text-2xl">{String(val).padStart(2,"0")}</div><div className="text-[9px] text-zinc-400">{label}</div></div>)}</div><a href="https://www.youtube.com/watch?v=iFl4YeX6jmc" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-purple-300">▶ Watch to keep up with Doomsday ↗</a></div>};
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
  const[searchOffset,setSearchOffset]=useState(0);
  const[searchSources,setSearchSources]=useState<string[]>([]);
  const[searchLoading,setSearchLoading]=useState(false);
  const[searchLoadingMore,setSearchLoadingMore]=useState(false);
  const[searchUnavailable,setSearchUnavailable]=useState<string[]>([]);
  const[searchFiltersOpen,setSearchFiltersOpen]=useState(false);
  const[searchError,setSearchError]=useState("");
  const[movieGenre,setMovieGenre]=useState("");
  const[movieShelfLoading,setMovieShelfLoading]=useState(false);
  const[movieTotal,setMovieTotal]=useState(0);
  const[movieLoadingMore,setMovieLoadingMore]=useState(false);
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
  const[season,setSeason]=useState("");
  const[episode,setEpisode]=useState("");
  const[startAt,setStartAt]=useState("");
  const[playerContentId,setPlayerContentId]=useState("");
  const[resumeSeconds,setResumeSeconds]=useState(0);
  const[autoSkip,setAutoSkip]=useState(false);
  const[skipNotice,setSkipNotice]=useState<"intro"|"credits"|null>(null);
  const[episodeSkipPoints,setEpisodeSkipPoints]=useState<EpisodeSkipPoints>({});
  const directVideoRef=useRef<HTMLVideoElement|null>(null);
  const lastAutoSkipRef=useRef<string>("");
  const[pendingDirectResume,setPendingDirectResume]=useState(0);

  // Chrome/Edge/Firefox need Media Source Extensions via hls.js for HLS streams.
  // Native HLS remains preferred where the browser supports it (for example Safari).
  useEffect(()=>{
    if(playbackFormat!=="hls"||!playbackUrl)return;
    const video=directVideoRef.current;
    if(!video)return;
    let cancelled=false;
    let hls:any=null;
    let script:HTMLScriptElement|null=null;
    const attach=()=>{
      if(cancelled)return;
      const Hls=(window as any).Hls;
      if(Hls&&Hls.isSupported()){
        hls=new Hls({enableWorker:true});
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR,(_:unknown,data:any)=>{
          if(data?.fatal&&!cancelled)setPlaybackError("This HLS stream could not be played. Check the authorized stream URL and CORS settings.");
        });
      }else if(video.canPlayType("application/vnd.apple.mpegurl")){
        video.src=playbackUrl;
      }else{
        setPlaybackError("This browser cannot play HLS video. Try a current browser or provide an MP4 stream.");
      }
    };
    if((window as any).Hls){attach();}
    else{
      script=document.createElement("script");
      script.src="https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
      script.async=true;
      script.onload=attach;
      script.onerror=()=>{if(!cancelled)setPlaybackError("The HLS playback engine could not load. Check your connection and try again.");};
      document.head.appendChild(script);
    }
    return()=>{cancelled=true;hls?.destroy();if(script?.parentNode)script.parentNode.removeChild(script);};
  },[playbackFormat,playbackUrl]);
  const[list,setList]=useState<Item[]>([]);
  const [browse,setBrowse]=useState("Home");
  const [focusMode,setFocusMode]=useState(false);
  const [nightMode,setNightMode]=useState(false);
  const [welcomeDismissed,setWelcomeDismissed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [authUser,setAuthUser]=useState<{email:string;displayName?:string|null;photoURL?:string|null}|null>(null);
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

  useEffect(()=>{
    if(!firebaseAuth)return;
    return onAuthStateChanged(firebaseAuth,async user=>{
      if(user){setAuthUser({email:user.email||"",displayName:user.displayName,photoURL:user.photoURL});return;}
      try{
        const response=await fetch("/api/auth/me",{cache:"no-store"});
        const data=await response.json().catch(()=>({}));
        if(data.authenticated&&data.user?.email)setAuthUser({email:String(data.user.email)});
        else setAuthUser(null);
      }catch{setAuthUser(null);}
    });
  },[]);

  const signOut=async()=>{
    try{if(firebaseAuth)await firebaseSignOut(firebaseAuth);}catch{}
    try{await fetch("/api/auth/signout",{method:"POST",cache:"no-store"});}catch{}
    setAuthUser(null);
  };

  const activeSkipKey=skipPointsKeyFor(playerContentId||String(selected?.id||""),season,episode);

  useEffect(()=>{
    if(!playerContentId&&!selected)return;
    try{
      const saved=localStorage.getItem(activeSkipKey);
      setEpisodeSkipPoints(saved?JSON.parse(saved) as EpisodeSkipPoints:{});
    }catch{setEpisodeSkipPoints({});}
    setSkipNotice(null);
    lastAutoSkipRef.current="";
  },[activeSkipKey,playerContentId,selected?.id]);

  const setEpisodeSkipPoint=(kind:"intro"|"credits",edge:"start"|"end")=>{
    const video=directVideoRef.current;
    if(!video||!Number.isFinite(video.currentTime))return;
    const point=Math.floor(video.currentTime);
    setEpisodeSkipPoints(previous=>{
      const current=previous[kind]||{start:0,end:0};
      const nextRange={...current,[edge]:point};
      const next={...previous,[kind]:nextRange};
      try{localStorage.setItem(activeSkipKey,JSON.stringify(next));}catch{}
      return next;
    });
  };
  const isJujutsuKaisen=/jujutsu kaisen/i.test(String(selected?.title||selected?.name||""));
  const isOnePieceTitle=/one piece/i.test(String(selected?.title||selected?.name||""));
  const seasonNumbers=new Set<number>();
  const isJoJoTitle=/jojo.?s bizarre adventure/i.test(String(selected?.title||selected?.name||""));
  // Use season metadata when available; never fabricate a universal 1–10 list.
  const rawSeasonMetadata=titleDetails?.seasons ?? titleDetails?.season_numbers ?? selected?.seasons;
  if(Array.isArray(rawSeasonMetadata)){
    rawSeasonMetadata.forEach((entry:any)=>{
      const number=typeof entry==="number"?entry:Number(entry?.season_number??entry?.season??entry?.number);
      if(Number.isInteger(number)&&number>0)seasonNumbers.add(number);
    });
  }
  const seasonCount=Number(titleDetails?.numberOfSeasons??titleDetails?.season_count??titleDetails?.total_seasons??selected?.season_count);
  if(!seasonNumbers.size&&Number.isInteger(seasonCount)&&seasonCount>0&&seasonCount<=100){
    for(let s=1;s<=seasonCount;s++)seasonNumbers.add(s);
  }
  // Known editorial exceptions where season/part data is not yet supplied by metadata.
  if(!seasonNumbers.size&&isJujutsuKaisen){seasonNumbers.add(1);seasonNumbers.add(2);}
  if(!seasonNumbers.size&&isJoJoTitle){for(let part=1;part<=6;part++)seasonNumbers.add(part);}
  const seasonOptions=Array.from(seasonNumbers).sort((a,b)=>a-b).map(season=>({season}));

  const get=async(s:string,p:string)=>{
    const r=await fetch("/api/catalog?source="+s+"&path="+encodeURIComponent(p));
    if(!r.ok)throw Error();
    return r.json();
  };

  const play=(m:Item)=>{
    setSelected(m);setSeason("");setEpisode("");setPlaybackUrl("");setPlaybackFormat("");setPlaybackError("");setDetailError("");
    setPlayerContentId("");setResumeSeconds(0);setPendingDirectResume(0);setStartAt("");
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

  const startPlayback=async(resumeOverride?:number)=>{
    if(!selected)return;
    if(isGameItem(selected)){
      setPlaybackError("Games are listed for discovery, not streamed in Streamivio. Use the official game page above for platform and purchase information.");
      return;
    }
    setPlaybackLoading(true);setPlaybackError("");setPlaybackUrl("");
    const kind:"movie"|"tv"=isTvItem(selected)?"tv":"movie";
    const resolvedImdbId=String(selected.imdbId||selected.imdb_id||selected.imdbID||titleDetails?.imdbId||titleDetails?.imdb_id||titleDetails?.imdbID||"");
    try{
      // Prefer authorized catalog URLs; otherwise ask the server to resolve a known title ID.
      const playbackParams=new URLSearchParams({id:String(selected.id),title:String(selected.title||selected.name||""),type:String(selected.type||selected.media_type||(isGameItem(selected)?"game":"movie")),imdb_id:resolvedImdbId});
      if(kind==="tv"&&season.trim()&&episode.trim()){playbackParams.set("season",season);playbackParams.set("episode",episode);}
      if(startAt.trim())playbackParams.set("startAt",startAt.trim());
      const response=await fetch("/api/playback?"+playbackParams.toString(),{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(response.ok&&data.available&&(typeof data.stream_url==="string"||typeof data.player_url==="string")){
        const directProgressId=String(resolvedImdbId||selected.id);
        let initialStart=resumeOverride!==undefined?resumeOverride:(startAt.trim()?Number(startAt):0);
        if(!initialStart){
          try{initialStart=Number(localStorage.getItem(progressKeyFor(directProgressId))||0);}catch{initialStart=0;}
        }
        setPlayerContentId(directProgressId);
        setPendingDirectResume(Number.isFinite(initialStart)&&initialStart>0?initialStart:0);
        if(data.format!=="mp4"&&data.format!=="hls")throw new Error("The configured media source must be MP4 or HLS.");
        setPlaybackUrl(data.stream_url);setPlaybackFormat(data.format);return;
      }
      if(!response.ok||!data.available){
        throw new Error(data.message||data.error||"No authorised MP4/HLS playback source is configured for this title.");
      }
      throw new Error("The playback resolver returned an unsupported response. Please try again.");
    }catch(error){
      setPlaybackError(error instanceof Error?error.message:"Playback is unavailable right now.");
    }finally{
      setPlaybackLoading(false);
    }
  };

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
      const params=new URLSearchParams({q:query.trim(),scope:category,limit:"60",offset:"0"});
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
      setSearchOffset(found.length);
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

  const loadMoreSearch=async()=>{
    if(searchLoadingMore||searchLoading||searchOffset>=searchTotal||q.trim().length<2)return;
    setSearchLoadingMore(true);
    setSearchError("");
    try{
      const params=new URLSearchParams({q:q.trim(),scope:searchCategory,limit:"60",offset:String(searchOffset)});
      if(searchCountry.trim())params.set("country",searchCountry.trim());
      if(searchYear.trim())params.set("year",searchYear.trim());
      if(searchAgeRating)params.set("age_rating",searchAgeRating);
      if(searchSort)params.set("sort",searchSort);
      const response=await fetch("/api/search?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"More results could not be loaded");
      const found=Array.isArray(data.results)?data.results: [];
      setResults(current=>[...current,...found.filter((item:any)=>!current.some(existing=>String(existing.id)===String(item.id)))]);
      setSearchTotal(Number.isFinite(Number(data.total))?Math.max(0,Number(data.total)):searchTotal);
      setSearchOffset(searchOffset+found.length);
      setSearchSources(Array.isArray(data.sources)?data.sources.filter((source:any)=>typeof source==="string"):[]);
      setSearchUnavailable(Array.isArray(data.unavailable)?data.unavailable:[]);
    }catch(error){
      setSearchError(error instanceof Error?error.message:"More results could not be loaded.");
    }finally{
      setSearchLoadingMore(false);
    }
  };

  const loadMoreMovies=async()=>{
    if(movieLoadingMore)return;
    const current=rows["Movies to Explore"]||[];
    setMovieLoadingMore(true);
    try{
      const params=new URLSearchParams({scope:"movies",popular:"1",limit:"60",offset:String(current.length)});
      if(movieGenre)params.set("genre",movieGenre);
      const response=await fetch("/api/search?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"More movies could not be loaded");
      const next=Array.isArray(data.results)?data.results as Item[]:[];
      setRows(previous=>{
        const existing=previous["Movies to Explore"]||[];
        const ids=new Set(existing.map(item=>String(item.id)));
        return {...previous,"Movies to Explore":[...existing,...next.filter(item=>!ids.has(String(item.id)))]};
      });
      setMovieTotal(Number.isFinite(Number(data.total))?Math.max(0,Number(data.total)):current.length+next.length);
    }catch(error){
      console.error("More Streamivio movies could not be loaded",error);
    }finally{
      setMovieLoadingMore(false);
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
    const params=new URLSearchParams({scope:"movies",popular:"1",limit:"60",offset:"0"});
    if(movieGenre)params.set("genre",movieGenre);
    setMovieShelfLoading(true);
    fetch("/api/search?"+params.toString())
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Local movie catalog unavailable");
        const movies=Array.isArray(data.results)?data.results as Item[]:[];
        setRows(current=>({...current,"Movies to Explore":movies}));
        setMovieTotal(Number.isFinite(Number(data.total))?Math.max(0,Number(data.total)):movies.length);
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
    const shelves=[["tv","TV to Explore"],["documentaries","Documentaries"],["kids","Family & Kids"],["reality","Reality & Competition"]];
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

  return <main className={"min-h-screen pb-24 lg:pb-12 transition-colors "+(nightMode?"bg-[#020304] text-zinc-100":"bg-black text-white")}>
    {!welcomeDismissed&&<OpeningScreen onEnter={()=>{setBrowse("Home");setQ("");setSelected(null);setWelcomeDismissed(true);}} />}
    <header className="site-topbar fixed left-0 right-0 top-0 z-40 flex h-[68px] items-center gap-4 border-b border-white/10 bg-black/90 px-4 backdrop-blur-xl md:px-6">
      <button onClick={()=>{setBrowse("Home");setQ("");}} aria-label="Streamivio home" className="flex shrink-0 items-center"><StreamivioLogo className="text-[19px]"/></button>
      <nav className="hidden items-center gap-1 xl:flex">{[{label:"Home",icon:HomeIcon},{label:"Movies",icon:Clapperboard},{label:"TV Shows",icon:Tv},{label:"Anime",icon:Compass},{label:"Games",icon:Gamepad2}].map(({label,icon:Icon})=><button key={label} onClick={()=>{setBrowse(label);setQ("");}} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${browse===label?"bg-purple-800 text-white":"text-zinc-300 hover:bg-white/10"}`}><Icon className="h-4 w-4"/>{label}</button>)}
      <a href="/manga" className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"><BookOpen className="h-4 w-4"/>Manga</a><a href="/download" className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10">↓ Download</a><button onClick={()=>setBrowse("My List")} className="rounded-full px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10">My List</button></nav>
      <div className="ml-auto flex min-w-0 items-center gap-2"><form onSubmit={submitSearch} role="search" className="relative flex items-center"><Search className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQ("");}} placeholder="Search movies, shows, anime..." aria-label="Search titles" autoComplete="off" maxLength={100} className="w-36 rounded-full border border-white/10 bg-white/[0.06] py-2 pl-9 pr-8 text-xs outline-none focus:border-purple-400 sm:w-48 lg:w-64"/>{q&&<button type="button" onClick={()=>setQ("")} aria-label="Clear search" className="absolute right-3 text-zinc-400"><X className="h-3.5 w-3.5"/></button>}</form>
      <button type="button" onClick={()=>setFocusMode(v=>!v)} title="Focus mode" className="hidden rounded-full px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 lg:block">{focusMode?"Focus on":"Focus"}</button><a href="/subscribe" className="hidden rounded-full bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-600 sm:block">Subscribe</a>{authUser?<button onClick={()=>void signOut()} title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-700 text-sm">{authUser.photoURL?<img src={authUser.photoURL} alt="Profile" className="h-full w-full rounded-full object-cover"/>:"S"}</button>:<a href="/sign-in" className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-700 text-sm font-bold">S</a>}</div>
    </header>
    <div className="h-[68px]"/>
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 xl:hidden">{[{label:"Home",icon:HomeIcon},{label:"Movies",icon:Clapperboard},{label:"TV Shows",icon:Tv},{label:"Anime",icon:Compass},{label:"Games",icon:Gamepad2}].map(({label,icon:Icon})=><button key={label} onClick={()=>{setBrowse(label);setQ("");}} className={`flex flex-col items-center gap-1 py-1 text-[10px] ${browse===label?"text-purple-300":"text-zinc-500"}`}><Icon className="h-5 w-5"/><span>{label}</span></button>)}</nav>
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
                  <CatalogPoster item={m} className="h-full w-full" imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"/>
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
                  <span className="absolute bottom-2 left-2 right-2 truncate text-xs font-bold">{m.title||m.name}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold">{m.title||m.name}</div>
                <div className="text-xs text-zinc-400">{m.source}{m.year?` · ${m.year}`:""}{m.rating?` · ★ ${m.rating.toFixed(1)}`:""}</div>
              </button>)}</div>
            : searchUnavailable.length>0
              ? <p className="text-sm text-zinc-500">No matches were returned because one or more selected sources are unavailable. Try again later.</p>
              : <p className="text-sm text-zinc-500">No matches for “{q.trim()}”. Try fewer words, check the spelling, choose All, or remove a filter.</p>}
      {results.length>0&&searchOffset<searchTotal&&<div className="mt-6 flex justify-center"><button type="button" onClick={()=>void loadMoreSearch()} disabled={searchLoadingMore} className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">{searchLoadingMore?"Loading…":"Load more results"}</button></div>}
    </section>}

    {!q.trim()&&hero&&<header className="hero-shell relative overflow-hidden">
      <div className="hero-art absolute inset-0">{hero.backdrop||hero.poster?<img src={hero.backdrop||hero.poster||""} alt="" className="h-full w-full object-cover"/>:<CatalogPoster item={hero} className="h-full w-full opacity-40" imageClassName="h-full w-full object-cover"/>}</div>
      <div className="hero-shade absolute inset-0"/>
      <div className="hero-content relative z-10 flex h-full max-w-2xl flex-col justify-end px-5 pb-10 pt-40 sm:px-8 sm:pb-12 md:px-12 md:pb-14">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.3em] text-sky-300">Featured for you</div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[.35em] text-zinc-200">Only on Streamivio</div>
        <h1 className="max-w-xl text-4xl font-black leading-[.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl">{hero.title||hero.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-200 sm:text-xs"><span>{hero.source}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/><span>{hero.year}</span><span className="h-1 w-1 rounded-full bg-zinc-400"/>HD</div>
        <p className="mt-2 max-w-md line-clamp-3 text-xs leading-5 text-zinc-100 drop-shadow sm:text-sm">{hero.overview||"Discover movies, series and anime."}</p>
        <div className="mt-5 flex gap-3"><button onClick={()=>setSelected(hero)} className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200"><Play className="h-3.5 w-3.5 fill-black"/>Watch Now</button><button onClick={()=>add(hero)} className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/25 px-5 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-white/15"><Plus className="h-3.5 w-3.5"/>My List</button></div>
      </div>
      <aside className="absolute right-5 top-5 z-20 w-[min(90vw,340px)] rounded-2xl border border-purple-400/25 bg-black/80 p-4 shadow-[0_0_35px_rgba(140,40,220,.22)] backdrop-blur-xl sm:right-8 sm:top-8"><div className="flex items-center gap-2 text-sm font-bold"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Avengers%20Doomsday%20logo.png" alt="" className="h-8 w-auto max-w-12 object-contain"/>Avengers: Doomsday</div><DoomsdayCountdown/></aside>
    </header>}

    {loading&&!hero&&<div className="mx-4 mt-6 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-xs text-zinc-400 md:mx-12">Catalog shelves are loading in the background. You can still browse Streamivio.</div>}

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
      
      {!q.trim()&&browse==="Home"&&!focusMode&&<div className="relative z-10 mx-auto max-w-[1700px] pt-5"><section className="mb-7"><div className="mb-3 flex items-center justify-between px-4 md:px-12"><h2 className="text-lg font-black">Trending Now</h2><span className="text-xs text-zinc-500">Popular titles</span></div><div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-4 md:px-12">{Object.values(rows).flat().filter((item,i,all)=>all.findIndex(x=>String(x.id)===String(item.id))===i).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,12).map(item=><button key={String(item.id)} onClick={()=>setSelected(item)} className="min-w-[150px] max-w-[210px] text-left"><div className="aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900"><CatalogPoster item={item} className="h-full w-full" imageClassName="h-full w-full object-cover"/></div><p className="mt-2 truncate text-sm font-bold">{item.title||item.name}</p><p className="text-xs text-zinc-500">{item.year||""}</p></button>)}</div></section><section className="mb-8 px-4 md:px-12"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">Popular Franchises</h2><span className="text-xs text-zinc-500">Explore collections</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{["Marvel","DC","Star Wars","Harry Potter","One Piece","Fast & Furious"].map((name,index)=><button key={name} onClick={()=>{setQ(name);void runSearch(name,"all","","","","relevance");}} className={"flex min-h-24 items-end rounded-xl border border-white/10 p-4 text-left font-black shadow-lg hover:brightness-125 "+["bg-gradient-to-br from-red-950 to-black","bg-gradient-to-br from-blue-950 to-black","bg-gradient-to-br from-indigo-950 to-black","bg-gradient-to-br from-amber-950 to-black","bg-gradient-to-br from-orange-950 to-black","bg-gradient-to-br from-slate-950 to-black"][index]}>{name}</button>)}</div></section></div>}{!focusMode&&<><section className="mb-8 px-4 md:px-12"><h2 className="mb-3 text-lg font-black">Watch to prepare for Avengers: Doomsday</h2><p className="mb-4 text-xs text-zinc-500">Suggested catch-up titles for the multiverse saga.</p><div className="scrollbar-hide flex gap-3 overflow-x-auto pb-4">{[["Captain America: The First Avenger","2011"],["The Avengers","2012"],["Captain America: The Winter Soldier","2014"],["Avengers: Age of Ultron","2015"],["Captain America: Civil War","2016"],["Doctor Strange","2016"],["Thor: Ragnarok","2017"],["Avengers: Infinity War","2018"],["Avengers: Endgame","2019"],["Loki","2021"],["Doctor Strange in the Multiverse of Madness","2022"],["Black Panther: Wakanda Forever","2022"],["Ant-Man and the Wasp: Quantumania","2023"],["The Marvels","2023"],["Deadpool & Wolverine","2024"],["Captain America: Brave New World","2025"],["Thunderbolts*","2025"],["The Fantastic Four: First Steps","2025"]].map(([title,year])=><button key={title} onClick={()=>{const match=Object.values(rows).flat().find(it=>String(it.title||it.name).toLowerCase()===title.toLowerCase());if(match)setSelected(match);else window.location.href="/discover";}} className="min-w-[135px] rounded-lg border border-white/10 bg-white/[.04] p-3 text-left hover:bg-white/10"><span className="text-[10px] text-purple-300">{year}</span><span className="mt-1 block text-xs font-bold">{title}</span></button>)}</div></section></>}{browse==="My List"
        ? <Row title="My List" items={list} onOpen={play}/>
        : Object.entries(rows)
          .filter(([title])=>browse==="Home"
            || (browse==="TV Shows"&&title==="TV to Explore")
            || (browse==="Documentaries"&&title==="Documentaries")
            || (browse==="Kids & Family"&&title==="Family & Kids")
            || (browse==="Reality"&&title==="Reality & Competition")
            || (browse==="Anime"&&title==="Anime Spotlight")
            || (browse==="Movies"&&title==="Movies to Explore")
            || (browse==="Games"&&title==="Games Spotlight")
)
          .map(([title,items])=><Row key={title} title={title} items={items} onOpen={play}/>)}
      {!q.trim()&&((browse==="Home"&&movieTotal>0)||(browse==="Movies"&&(rows["Movies to Explore"]?.length||0)<movieTotal))&&<div className="flex justify-center py-6"><button type="button" onClick={()=>browse==="Home"?setBrowse("Movies"):void loadMoreMovies()} disabled={browse==="Movies"&&movieLoadingMore} className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">{browse==="Home"?`Browse all ${movieTotal} movies`:movieLoadingMore?"Loading movies…":"Load more movies"}</button></div>}
    </div>}


    {selected&&playbackUrl&&<div className="fixed inset-0 z-[70] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Streamivio video player">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#111] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="min-w-0 truncate text-sm font-semibold">{selected.title||selected.name||"Now playing"} <span className="ml-2 text-xs font-normal text-zinc-500">STREAMIVIO</span></div>{isOnePieceTitle&&(playbackFormat==="mp4"||playbackFormat==="hls")&&<button type="button" onClick={()=>{setAutoSkip(value=>!value);lastAutoSkipRef.current="";}} aria-pressed={autoSkip} className={"shrink-0 rounded px-3 py-2 text-xs font-semibold "+(autoSkip?"bg-red-600 text-white":"bg-white/10 text-zinc-300 hover:bg-white/20")}>Auto-skip {autoSkip?"On":"Off"}</button>}</div>
        <button type="button" onClick={()=>{setPlaybackUrl("");setPlaybackError("");}} className="ml-4 flex shrink-0 items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><X className="h-4 w-4"/>Back to details</button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        {playbackFormat==="embed"?<iframe title={String(selected.title||selected.name||"Video player")} src={playbackUrl} className="h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:(playbackFormat==="mp4"||playbackFormat==="hls")?<div className="relative flex h-full w-full items-center justify-center"><video ref={directVideoRef} key={playbackUrl} controls autoPlay playsInline className="h-full w-full object-contain" src={playbackUrl} onLoadedMetadata={e=>{const video=e.currentTarget;if(pendingDirectResume>0&&Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Math.min(pendingDirectResume,Math.max(0,video.duration-1));}} onTimeUpdate={e=>{if(!playerContentId)return;const video=e.currentTarget;const seconds=Number.isFinite(video.currentTime)?Math.floor(video.currentTime):0;setResumeSeconds(seconds);const duration=video.duration;let segment: "intro"|"credits"|null=null;const intro=episodeSkipPoints.intro;const credits=episodeSkipPoints.credits;if(isOnePieceTitle){if(intro&&intro.end>intro.start&&seconds>=intro.start&&seconds<intro.end)segment="intro";else if(credits&&credits.end>credits.start&&seconds>=credits.start&&seconds<credits.end)segment="credits";}setSkipNotice(segment);if(autoSkip&&segment&&lastAutoSkipRef.current!==segment+":"+playerContentId){const range=segment==="intro"?intro:credits;if(range){video.currentTime=range.end;lastAutoSkipRef.current=segment+":"+playerContentId;setSkipNotice(null);}}try{localStorage.setItem(progressKeyFor(playerContentId),String(seconds));}catch{}}} onEnded={()=>{if(playerContentId){try{localStorage.removeItem(progressKeyFor(playerContentId));}catch{}setResumeSeconds(0);setPendingDirectResume(0);}setSkipNotice(null);lastAutoSkipRef.current="";}}>Your browser cannot play this video format.</video>{skipNotice&&<button type="button" onClick={()=>{const video=directVideoRef.current;const range=skipNotice==="intro"?episodeSkipPoints.intro:episodeSkipPoints.credits;if(video&&range)video.currentTime=range.end;setSkipNotice(null);}} className="absolute bottom-24 right-6 rounded-md border border-white/30 bg-black/80 px-5 py-3 text-sm font-bold text-white shadow-xl hover:bg-white hover:text-black">Skip {skipNotice==="intro"?"Intro":"Credits"} <span className="ml-2 text-xs opacity-70">↗</span></button>}</div> :<p className="p-6 text-sm text-amber-200">Unsupported playback format. Configure an authorised MP4 or HLS source.</p>}
      </div>
      {isOnePieceTitle?<div className="shrink-0 border-t border-white/10 bg-[#111] px-3 py-3 sm:px-5"><div className="mb-2 flex flex-wrap items-center justify-center gap-2"><span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">One Piece episode skip markers</span><button type="button" onClick={()=>setEpisodeSkipPoint("intro","start")} className="rounded border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">Intro start</button><button type="button" onClick={()=>setEpisodeSkipPoint("intro","end")} className="rounded border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">Intro end</button><button type="button" onClick={()=>setEpisodeSkipPoint("credits","start")} className="rounded border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">Credits start</button><button type="button" onClick={()=>setEpisodeSkipPoint("credits","end")} className="rounded border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/10">Credits end</button></div><p className="text-center text-[10px] text-zinc-500">Set markers while the One Piece episode is playing. Saved per episode on this device.</p></div>:<div className="shrink-0 border-t border-white/10 bg-[#111] px-4 py-2 text-center text-[11px] text-zinc-500">Playback controls are available for this title.</div>}
    </div>}
    {selected&&!playbackUrl&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={()=>setSelected(null)}><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-[#181818] p-6" onClick={e=>e.stopPropagation()}>
      <div className="text-xs font-bold uppercase tracking-wider text-purple-300">{detailTitle?.source||selected.source}</div>
      <h2 className="mt-2 text-2xl font-bold">{detailTitle?.title||detailTitle?.name||selected.title||selected.name}</h2>
      {(detailTitle?.year||detailTitle?.rating||detailTitle?.contentRating||detailTitle?.ageRating||detailTitle?.runtime)&&<div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
        {detailTitle?.year&&<span>{detailTitle.year}</span>}{(detailTitle?.contentRating||detailTitle?.ageRating)&&<span>{detailTitle.contentRating||detailTitle.ageRating}</span>}{detailTitle?.runtime&&<span>{detailTitle.runtime}</span>}{typeof detailTitle?.rating==="number"&&<span>★ {detailTitle.rating.toFixed(1)}</span>}
      </div>}
      {detailTitle?.genres&&detailTitle.genres.length>0&&<p className="mt-3 text-sm text-zinc-400">{detailTitle.genres.join(" · ")}</p>}
      {selected.platforms&&selected.platforms.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Platforms:</span> {selected.platforms.join(", ")}</p>}
      {selected.developer&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Developer:</span> {selected.developer}</p>}
      {selected.publisher&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Publisher:</span> {selected.publisher}</p>}
      {selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-purple-300 hover:text-purple-300">Official game page ↗</a>}
      {titleDetailsLoading&&<p role="status" className="mt-3 text-xs text-zinc-400"><LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin"/>Loading title details and credits…</p>}
      {titleDetailsMessage&&!titleDetailsLoading&&!titleDetailsMetadataAvailable&&<p className="mt-3 text-xs text-zinc-500">{titleDetailsMessage}</p>}
      {titleDetailsError&&<p role="status" className="mt-3 text-xs text-amber-300">{titleDetailsError}</p>}
      <a className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-white/10" target="_blank" rel="noreferrer" href={"https://www.youtube.com/results?search_query="+encodeURIComponent(String(detailTitle?.title||detailTitle?.name||selected.title||selected.name)+" official trailer")}>Watch trailer ↗</a><p className="mt-3 leading-6 text-zinc-300">{detailTitle?.overview||detailTitle?.description||"A synopsis has not been added for this title yet. Check back later for more information."}</p>
      {detailTitle?.directors&&detailTitle.directors.length>0&&<p className="mt-3 text-sm text-zinc-400"><span className="text-zinc-200">Director:</span> {detailTitle.directors.join(", ")}</p>}
      {detailTitle?.cast&&detailTitle.cast.length>0&&<p className="mt-2 text-sm text-zinc-400"><span className="text-zinc-200">Cast:</span> {detailTitle.cast.join(", ")}</p>}
      {detailError&&<p role="status" className="mt-4 text-sm text-amber-300">{detailError}</p>}
      <p className="mt-4 text-xs text-zinc-500">Playback is enabled only when Streamivio has an authorised MP4 or HLS source configured for this title.</p>
      {resumeSeconds>0&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2 text-xs text-zinc-300">
        <span>Saved playback position: {formatSeconds(resumeSeconds)}</span>
        <button type="button" onClick={()=>void startPlayback(resumeSeconds)} disabled={playbackLoading} className="rounded bg-zinc-700 px-3 py-1.5 font-semibold disabled:opacity-50">Resume</button>
      </div>}
      {isTvItem(selected)&&<div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2"><label className="grid gap-1 text-xs text-zinc-300">Season<select value={season} onChange={e=>{setSeason(e.target.value);setEpisode("");}} className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm"><option value="">Choose a season</option>{seasonOptions.map((entry:any)=><option key={entry.season} value={String(entry.season)}>Season {entry.season}</option>)}</select></label><label className="grid gap-1 text-xs text-zinc-300">Episode<input type="number" min="1" inputMode="numeric" disabled={!season} value={episode} onChange={e=>setEpisode(e.target.value)} placeholder="Episode number" className="rounded border border-white/15 bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50"/></label><p className="text-[11px] text-zinc-500 sm:col-span-2">Choose a season and episode, then select Play to load that episode in the player.</p></div>}
      {playbackUrl&&<div className="mt-5 overflow-hidden rounded-lg bg-black">
        {(playbackFormat==="mp4"||playbackFormat==="hls")?<video key={playbackUrl} controls autoPlay playsInline className="aspect-video w-full" src={playbackUrl} onLoadedMetadata={e=>{const video=e.currentTarget;if(pendingDirectResume>0&&Number.isFinite(video.duration)&&video.duration>0){video.currentTime=Math.min(pendingDirectResume,Math.max(0,video.duration-1));}}} onTimeUpdate={e=>{if(!playerContentId)return;const video=e.currentTarget;const seconds=Number.isFinite(video.currentTime)?Math.floor(video.currentTime):0;setResumeSeconds(seconds);try{localStorage.setItem(progressKeyFor(playerContentId),String(seconds));}catch{}}} onEnded={()=>{if(playerContentId){try{localStorage.removeItem(progressKeyFor(playerContentId));}catch{}setResumeSeconds(0);setPendingDirectResume(0);}}}>Your browser cannot play this video format.</video> :<p className="p-4 text-sm text-amber-200">Unsupported playback format.</p>}
        <p className="px-3 py-2 text-xs text-zinc-400">Playback controls and available subtitle options are provided by the video player. Availability can vary by title and region.</p>
      </div>}
      {playbackError&&<p role="status" className="mt-4 text-sm text-amber-300">{playbackError}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={getCanonicalTitleUrl(selected)} className="rounded border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10">Open title page ↗</a>
        
        {/one piece/i.test(String(selected.title||selected.name||""))&&<a href="/anime/one-piece" className="flex items-center gap-2 rounded border border-amber-400/50 px-5 py-2 font-bold text-amber-200 hover:bg-amber-400/10">One Pace Edition</a>}
        {!isGameItem(selected)&&<button onClick={()=>void startPlayback()} disabled={playbackLoading} className="flex items-center gap-2 rounded bg-[#e50914] px-5 py-2 font-bold disabled:opacity-60"><Play className="h-4 w-4 fill-current"/>{playbackLoading?"Checking source…":playbackUrl?"Reload player":"Play"}</button>}
        {isGameItem(selected)&&<p className="self-center text-xs text-zinc-400">Game discovery only — Streamivio does not stream playable game builds.</p>}
        <button onClick={()=>setSelected(null)} className="rounded bg-zinc-700 px-5 py-2 font-bold">Close</button>
      </div>
    </div></div>}
  </main>
}
