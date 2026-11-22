import {NextRequest,NextResponse} from "next/server";
import {catalog} from "../../data/catalog";
import {gamesCatalog} from "../../data/games";

const SCOPES=["all","movies","anime","tv","documentaries","kids","reality","games"] as const;
type Scope=(typeof SCOPES)[number];
type SearchRecord=Record<string,any>;

const fold=(value:unknown)=>String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const compact=(value:unknown)=>fold(value).replace(/\s+/g,"");
const words=(value:unknown)=>fold(value).split(/\s+/).filter(Boolean);

function matchesScope(type:string,scope:Scope){
  if(scope==="all")return true;
  if(scope==="movies")return type==="movie";
  if(scope==="tv")return type==="tv";
  if(scope==="anime")return type==="anime";
  if(scope==="documentaries")return type==="documentary";
  if(scope==="kids")return type==="kids";
  if(scope==="games")return type==="game";
  return type==="reality";
}

function levenshtein(left:string,right:string,limit:number){
  if(left===right)return 0;
  if(Math.abs(left.length-right.length)>limit)return limit+1;
  const previous=Array.from({length:right.length+1},(_,i)=>i);
  for(let i=1;i<=left.length;i++){
    const current=[i];
    for(let j=1;j<=right.length;j++){
      current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(left[i-1]===right[j-1]?0:1));
    }
    for(let j=0;j<current.length;j++)previous[j]=current[j];
  }
  return previous[right.length]<=limit?previous[right.length]:limit+1;
}

function wordScore(queryWord:string,candidates:string[]){
  let best=0;
  for(const candidate of candidates){
    if(candidate===queryWord)best=Math.max(best,50);
    else if(queryWord.length>=3&&candidate.startsWith(queryWord))best=Math.max(best,32);
    else if(queryWord.length>=4&&candidate.length>=4&&(candidate.includes(queryWord)||queryWord.includes(candidate)))best=Math.max(best,18);
    else if(queryWord.length>=4){
      const allowance=queryWord.length<=7?1:2;
      if(levenshtein(queryWord,candidate,allowance)<=allowance)best=Math.max(best,14);
    }
  }
  return best;
}

function scoreResult(item:SearchRecord,query:string){
  const foldedQuery=fold(query);
  const compactQuery=compact(query);
  const title=String(item.title||item.name||"");
  const compactTitle=compact(title);
  const titleCandidates=[title,item.original_title,...(Array.isArray(item.alternate_titles)?item.alternate_titles:[])].filter(Boolean).map(words);
  const titleFlat=titleCandidates.map(list=>list.join(" "));
  const metadata=[
    item.overview,item.description,item.type,item.year,item.ageRating,item.contentRating,item.age_rating,
    ...(Array.isArray(item.genres)?item.genres:[]),
    ...(Array.isArray(item.keywords)?item.keywords:[]),
    ...(Array.isArray(item.country)?item.country:[]),
    ...(Array.isArray(item.cast)?item.cast:[]),
    ...(Array.isArray(item.directors)?item.directors:[]),
    ...(Array.isArray(item.platforms)?item.platforms:[]),
    item.developer,item.publisher
  ].filter(Boolean).map(words);
  let score=0;
  if(compactQuery===compactTitle)score+=12000;
  else if(compactTitle.startsWith(compactQuery))score+=8500;
  else if(compactTitle.includes(compactQuery))score+=6500;
  else if(fold(title).includes(foldedQuery))score+=5500;
  if(titleFlat.slice(1).some(value=>value.includes(foldedQuery)))score+=4000;
  if(metadata.some(value=>value.join(" ").includes(foldedQuery)))score+=250;

  const queryWords=words(query).filter(word=>!["a","an","and","for","in","of","or","the","to","with"].includes(word));
  let matched=0;
  for(const queryWord of (queryWords.length?queryWords:words(query))){
    const titleMatch=Math.max(0,...titleCandidates.map(candidates=>wordScore(queryWord,candidates)));
    const metadataMatch=Math.max(0,...metadata.map(candidates=>wordScore(queryWord,candidates)));
    if(titleMatch){score+=titleMatch+45;matched++;}
    else if(metadataMatch){score+=Math.max(5,metadataMatch/2);matched++;}
  }
  if(queryWords.length)score+=Math.round(100*matched/queryWords.length);
  return score;
}

function numberOrUndefined(value:unknown):number|undefined{
  if(typeof value==="number"&&Number.isFinite(value))return value;
  if(typeof value==="string"){
    const n=Number.parseFloat(value.trim());
    if(Number.isFinite(n))return n;
  }
  return undefined;
}

function textList(value:unknown):string[]{
  if(Array.isArray(value))return value.map(String).map(s=>s.trim()).filter(Boolean);
  if(typeof value==="string"&&value.trim())return value.split(/[,|]/).map(s=>s.trim()).filter(Boolean);
  return [];
}

function countryMatches(item:SearchRecord,query:string){
  const wanted=compact(query);
  const usAliases=["us","usa","unitedstates","unitedstatesofamerica"];
  const ukAliases=["uk","unitedkingdom","greatbritain","britain"];
  const aliases:Record<string,string[]>={
    us:usAliases,usa:usAliases,unitedstates:usAliases,unitedstatesofamerica:usAliases,
    uk:ukAliases,unitedkingdom:ukAliases,greatbritain:ukAliases,britain:ukAliases,
  };
  const accepted=aliases[wanted]||[wanted];
  return textList(item.country).some(country=>{
    const value=compact(country);
    return accepted.includes(value)||accepted.some(alias=>alias.length>=4&&value.startsWith(alias));
  });
}

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const rawQuery=(params.get("q")||"").trim().replace(/\s+/g," ");
  const rawScope=params.get("scope")||"all";
  const popular=params.get("popular")==="1";
  const genre=compact(params.get("genre")||"");
  const country=(params.get("country")||"").trim();
  const year=(params.get("year")||"").trim();
  const ageRating=(params.get("age_rating")||"").trim().toLocaleLowerCase();
  const sortParam=(params.get("sort")||"").trim().toLocaleLowerCase();
  const allowedSorts=["relevance","rating","year","title"];
  const sort=allowedSorts.includes(sortParam)?sortParam:(rawQuery&&!popular?"relevance":"rating");
  const requestedLimit=Number(params.get("limit")||60);
  const limit=Number.isFinite(requestedLimit)?Math.min(100,Math.max(1,Math.floor(requestedLimit))):60;
  const requestedOffset=Number(params.get("offset")||0);
  const offset=Number.isFinite(requestedOffset)?Math.min(100000,Math.max(0,Math.floor(requestedOffset))):0;

  if(!SCOPES.includes(rawScope as Scope))return NextResponse.json({error:"Choose a supported search category."},{status:400});
  if(!popular&&(rawQuery.length<2||rawQuery.length>100))return NextResponse.json({
    error:"Enter at least 2 characters (up to 100) to search.",
    message:"Try a title, actor, genre, plot keyword, year, or game platform."
  },{status:400});
  if(year&&(!/^[0-9]{4}$/.test(year)||Number(year)<1888||Number(year)>2200))return NextResponse.json({error:"Enter a valid four-digit release year."},{status:400});

  const scope=rawScope as Scope;
  let mediaResults:SearchRecord[]=[];
  const catalogDatabase="streamivio-editorial";
  const unavailable:string[]=[];
  const sources:string[]=[];

  if(scope!=="games"){
    mediaResults=catalog.filter(item=>matchesScope(item.type,scope)).map(item=>({
      ...item,name:item.title,poster_url:(item as any).poster||null,
      contentRating:(item as any).ageRating||null,playback_available:false
    }));
  }

  const metadataApiBase=(process.env.STREAMIVIO_API_URL||process.env.NEXT_PUBLIC_STREAMIVIO_API_URL||"").replace(/\/+$/,"");
  if(rawQuery&&!popular&&scope!=="games"&&metadataApiBase&&process.env.STREAMIVIO_METADATA_SEARCH_ENABLED==="true"){
    const kinds=scope==="movies"?["movie"]:scope==="tv"?["series"]:scope==="anime"?["anime"]:scope==="all"?["movie","series","anime"]:[];
    const remoteRows:SearchRecord[]=[];
    const requests=await Promise.all(kinds.map(async kind=>{
      try{
        const endpoint=new URL("/media/search",metadataApiBase);
        endpoint.searchParams.set("q",rawQuery);
        endpoint.searchParams.set("kind",kind);
        endpoint.searchParams.set("limit",String(limit));
        const response=await fetch(endpoint,{cache:"no-store",signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error("Metadata request failed");
        const payload=await response.json();
        const values=Array.isArray(payload)?payload:Array.isArray(payload.results)?payload.results:Array.isArray(payload.metas)?payload.metas:Array.isArray(payload.data)?payload.data:[];
        return values.map((entry:SearchRecord)=>{
          const title=String(entry.title||entry.name||entry.titleText||"").trim();
          const images=entry.images||{};
          const poster=entry.poster_url||entry.poster||images.poster?.medium||images.poster?.large||entry.image||null;
          const rawId=String(entry.imdb_id||entry.imdbId||entry.id||"");
          const rowType=kind==="movie"?"movie":kind==="anime"?"anime":kind==="documentary"?"documentary":"tv";
          return {...entry,id:rawId||title,title,name:title,overview:entry.overview||entry.description||entry.plot||"",description:entry.description||entry.overview||entry.plot||"",poster,poster_url:poster,year:entry.year||entry.releaseYear||"",rating:numberOrUndefined(entry.rating??entry.imdbRating),genres:textList(entry.genres),type:rowType,imdb_id:/^tt\d+$/i.test(rawId)?rawId:entry.imdb_id||entry.imdbId||null,source:"StreamX Metadata",playback_available:false};
        }).filter((entry:SearchRecord)=>entry.title);
      }catch{
        unavailable.push("StreamX "+kind);
        return [];
      }
    }));
    for(const batch of requests)remoteRows.push(...batch);
    const seen=new Set<string>();
    const uniqueRemote=remoteRows.filter(item=>{
      const key=String(item.imdb_id||[compact(item.title),item.year].join(":"));
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    if(uniqueRemote.length){
      mediaResults=[...uniqueRemote,...mediaResults];
      sources.push("StreamX Metadata");
    }
  }

  let gameResults:SearchRecord[]=[];
  if(scope==="all"||scope==="games"){
    gameResults=gamesCatalog.map(game=>({
      id:game.id,title:game.title,name:game.title,overview:game.overview,description:game.overview,
      year:game.year,genres:game.genres,platforms:game.platforms,developer:game.developer,
      publisher:game.publisher,contentRating:game.ageRating,ageRating:game.ageRating,
      poster:null,url:game.officialUrl||null,source:"Local Games Catalog",type:"game"
    }));
  }

  let combined=[...mediaResults,...gameResults];
  if(!popular){
    const q=fold(rawQuery);
    if(scope==="games"||scope==="all"){
      gameResults=gameResults.filter(item=>scoreResult(item,rawQuery)>0);
    }else gameResults=[];
    const filteredMedia=mediaResults.filter(item=>scoreResult(item,rawQuery)>0);
    combined=scope==="games"?gameResults:scope==="all"?[...filteredMedia,...gameResults.filter(item=>scoreResult(item,rawQuery)>0)]:filteredMedia;
    if(!q)combined=[];
  }else{
    combined=scope==="games"?gameResults:scope==="all"?[...mediaResults,...gameResults]:mediaResults;
  }

  const filterResult=(item:SearchRecord)=>{
    if(genre&&!textList(item.genres).some(value=>compact(value)===genre))return false;
    if(country&&!countryMatches(item,country))return false;
    if(year&&String(item.year||"")!==year)return false;
    if(ageRating&&String(item.ageRating||item.age_rating||item.contentRating||"").toLocaleLowerCase()!==ageRating)return false;
    return true;
  };
  combined=combined.filter(filterResult);

  if(scope!=="games")sources.push("Streamivio Editorial Catalogue");
  if(scope==="all"||scope==="games")sources.push("Streamivio Games Catalogue");

  if(rawQuery&&!popular){
    combined=combined.map(item=>({...item,search_score:scoreResult(item,rawQuery)}));
    if(sort==="title")combined.sort((a,b)=>String(a.title||a.name).localeCompare(String(b.title||b.name)));
    else if(sort==="year")combined.sort((a,b)=>Number(b.year||0)-Number(a.year||0));
    else if(sort==="rating")combined.sort((a,b)=>(numberOrUndefined(b.rating)||0)-(numberOrUndefined(a.rating)||0));
    else combined.sort((a,b)=>(b.search_score||0)-(a.search_score||0)||(numberOrUndefined(b.rating)||0)-(numberOrUndefined(a.rating)||0));
  }else if(sort==="title")combined.sort((a,b)=>String(a.title||a.name).localeCompare(String(b.title||b.name)));
  else if(sort==="year")combined.sort((a,b)=>Number(b.year||0)-Number(a.year||0));
  else if(popular)combined.sort((a,b)=>{
    // Put Streamivio's wider editorial library ahead of chart-only fallback data.
    // This keeps discovery shelves varied instead of showing only highly rated chart entries.
    const rank=(item:SearchRecord)=>item.source==="Streamivio Library"?0:
      String(item.source||"").toLowerCase().includes("popular")?1:
      String(item.source||"").toLowerCase().includes("imdb")?2:3;
    return rank(a)-rank(b)||(numberOrUndefined(b.rating)||0)-(numberOrUndefined(a.rating)||0);
  });
  else combined.sort((a,b)=>(numberOrUndefined(b.rating)||0)-(numberOrUndefined(a.rating)||0));

  const total=combined.length;
  const results=combined.slice(offset,offset+limit).map((entry: SearchRecord)=>{ const {search_score,...item}=entry; return item; });
  return NextResponse.json({
    results,total,limit,offset,hasMore:offset+results.length<total,query:rawQuery,
    sources:[...new Set(sources)],unavailable:[...new Set(unavailable)],database:catalogDatabase
  },{
    headers:{"Cache-Control":"public, max-age=20, s-maxage=60, stale-while-revalidate=180"}
  });
}
