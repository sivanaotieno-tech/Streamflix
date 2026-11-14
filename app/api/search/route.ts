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

function normalizeExternal(row:SearchRecord,kind:"movie"|"tv"|"documentary"):SearchRecord|null{
  const titleValue=row.title||row.Title||row.name||row.Name||row.titleText||row.originalTitle||row.original_title;
  const title=typeof titleValue==="string"?titleValue.trim():String(titleValue??"").trim();
  if(!title)return null;
  const providerId=String(row.imdbID||row.imdb_id||row.imdbId||row.id||"").trim();
  const rawYear=row.year||row.Year||row.releaseYear||row.release_year||row.releaseDate||row.release_date||row.datePublished||row.date_published;
  const year=String(rawYear||"").match(/\d{4}/)?.[0]||"";
  const posterValue=row.poster||row.Poster||row.poster_url||row.image||row.imageUrl||row.primaryImage||row.thumbnail;
  const poster=typeof posterValue==="string"&&/^https:\/\//i.test(posterValue.trim())?posterValue.trim():null;
  const rawOverview=row.overview||row.description||row.plot||row.Plot||row.plotOutline||row.synopsis||row.storyline;
  const ratingValue=typeof row.rating==="object"&&row.rating!==null?row.rating.ratingValue:row.rating;
  const genres=textList(row.genres||row.genre||row.Genre);
  const countries=textList(row.country||row.countries||row.Country);
  const imdbId=/^tt\d+$/i.test(providerId)?providerId:undefined;
  return {
    id:imdbId||"imdb-search-"+compact(title)+(year?"-"+year:""),
    title,name:title,overview:String(rawOverview||""),description:String(rawOverview||""),
    year,rating:numberOrUndefined(ratingValue??row.imDbRating??row.imdbRating??row.userRating),
    type:kind,genres,country:countries,
    poster,poster_url:poster,
    contentRating:row.contentRating||row.age_rating||row.rated||row.Rated||row.certificate||null,
    ageRating:row.contentRating||row.age_rating||row.rated||row.Rated||row.certificate||null,
    imdbId,imdb_id:imdbId,imdbID:imdbId,
    source:"IMDb Search",metadata_source:"IMDb"
  };
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

function sameMediaFamily(a:SearchRecord,b:SearchRecord){
  const tvTypes=["tv","anime","documentary","kids","reality","documentaries"];
  return a.type===b.type||(tvTypes.includes(String(a.type))&&tvTypes.includes(String(b.type)));
}

function mergeUnique(existing:SearchRecord[],incoming:SearchRecord[]){
  const merged=[...existing];
  for(const candidate of incoming){
    const index=merged.findIndex(item=>{
      const aId=String(item.imdbId||item.imdb_id||item.imdbID||"");
      const bId=String(candidate.imdbId||candidate.imdb_id||candidate.imdbID||"");
      if(aId&&bId&&aId===bId)return true;
      const sameName=compact(item.title||item.name)===compact(candidate.title||candidate.name);
      const sameYear=!item.year||!candidate.year||String(item.year)===String(candidate.year);
      return sameName&&sameYear&&sameMediaFamily(item,candidate);
    });
    if(index<0){merged.push(candidate);continue;}
    const current=merged[index];
    merged[index]={
      ...candidate,...current,
      poster:current.poster||current.poster_url||candidate.poster||null,
      poster_url:current.poster_url||current.poster||candidate.poster_url||candidate.poster||null,
      overview:current.overview||current.description||candidate.overview||"",
      description:current.description||current.overview||candidate.description||"",
      rating:current.rating??candidate.rating,
      imdbId:current.imdbId||current.imdb_id||candidate.imdbId,
      imdb_id:current.imdb_id||current.imdbId||candidate.imdb_id,
      imdbID:current.imdbID||candidate.imdbID,
      metadata_source:candidate.metadata_source||current.metadata_source,
    };
  }
  return merged;
}

async function fetchExternal(base:string,query:string,kind:"movie"|"tv"|"documentary"){
  const target=new URL("/search",base);
  target.searchParams.set("q",query);
  target.searchParams.set("type",kind);
  const response=await fetch(target.toString(),{
    headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(4200)
  });
  if(!response.ok)throw new Error("External title search returned HTTP "+response.status);
  const payload=await response.json();
  return (Array.isArray(payload.results)?payload.results:[])
    .filter((row:unknown)=>Boolean(row)&&typeof row==="object"&&!Array.isArray(row))
    .map((row:SearchRecord)=>normalizeExternal(row,kind))
    .filter((row:SearchRecord|null):row is SearchRecord=>Boolean(row));
}

async function fetchAniList(query: string, page: number, perPage = 50) {
  const graph = `query ($page: Int, $perPage: Int, $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(type: ANIME, sort: POPULARITY_DESC, search: $search) {
        id
        idMal
        title { romaji english }
        description(asHtml: false)
        startDate { year }
        averageScore
        genres
        coverImage { extraLarge large }
        bannerImage
        episodes
        format
        countryOfOrigin
        isAdult
      }
    }
  }`;
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: graph,
      variables: { page, perPage, ...(query ? { search: query } : {}) },
    }),
    cache: "force-cache",
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error("Anime discovery returned HTTP " + response.status);
  const payload = await response.json();
  const pageData = payload?.data?.Page;
  const media = Array.isArray(pageData?.media) ? pageData.media : [];
  const countryNames: Record<string, string> = {
    JP: "Japan", KR: "South Korea", CN: "China", US: "United States", TW: "Taiwan",
  };
  const results = media
    // Streamivio's public discovery shelves exclude adult-only titles.
    .filter((item: SearchRecord) => item && !item.isAdult && item.title)
    .map((item: SearchRecord): SearchRecord => {
      const id = String(item.id);
      const title = String(item.title.english || item.title.romaji || "").trim();
      const description = String(item.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const countryCode = String(item.countryOfOrigin || "");
      const cover = item.coverImage?.extraLarge || item.coverImage?.large || null;
      return {
        id: "anilist-" + id,
        anilistId: id,
        malId: item.idMal ? String(item.idMal) : undefined,
        title,
        name: title,
        overview: description,
        description,
        year: item.startDate?.year ? String(item.startDate.year) : "",
        rating: typeof item.averageScore === "number" ? Number((item.averageScore / 10).toFixed(1)) : 0,
        type: "anime",
        media_type: "anime",
        genres: Array.isArray(item.genres) ? item.genres : [],
        country: countryCode ? [countryNames[countryCode] || countryCode] : [],
        ageRating: null,
        contentRating: null,
        poster: cover,
        poster_url: cover,
        backdrop: item.bannerImage || null,
        episodes: item.episodes || null,
        format: item.format || null,
        source: "AniList",
        url: "https://anilist.co/anime/" + encodeURIComponent(id),
        playback_available: false,
      };
    })
    .filter((item: SearchRecord) => Boolean(item.title));
  return {
    results,
    total: Number(pageData?.pageInfo?.total || results.length),
    hasNextPage: Boolean(pageData?.pageInfo?.hasNextPage),
  };
}

async function fetchPopular(base:string,kind:"movie"|"tv"|"documentary"){
  const target=new URL("/popular",base);
  target.searchParams.set("type",kind);
  const response=await fetch(target.toString(),{
    headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(6500)
  });
  if(!response.ok)throw new Error("IMDb popular titles returned HTTP "+response.status);
  const payload=await response.json();
  return (Array.isArray(payload.results)?payload.results:[])
    .filter((row:unknown)=>Boolean(row)&&typeof row==="object"&&!Array.isArray(row))
    .map((row:SearchRecord)=>normalizeExternal(row,kind))
    .filter((row:SearchRecord|null):row is SearchRecord=>Boolean(row));
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
  if (scope === "anime") {
    const page = Math.floor(offset / 50) + 1;
    const fallback = catalog
      .filter(item => matchesScope(item.type, "anime"))
      .map(item => ({ ...item, name: item.title, poster_url: (item as any).poster || null, source: item.source || "Streamivio Library" }))
      .filter((item: SearchRecord) => {
        if (!popular && scoreResult(item, rawQuery) <= 0) return false;
        if (genre && !textList(item.genres).some(value => compact(value) === genre)) return false;
        if (country && !countryMatches(item, country)) return false;
        if (year && String(item.year || "") !== year) return false;
        if (ageRating && (item.ageRating || item.contentRating) && String(item.ageRating || item.contentRating).toLocaleLowerCase() !== ageRating) return false;
        return true;
      });

    try {
      const anime = await fetchAniList(popular ? "" : rawQuery, page, 50);
      const filtered = anime.results.filter((item: SearchRecord) => {
        if (genre && !textList(item.genres).some(value => compact(value) === genre)) return false;
        if (country && !countryMatches(item, country)) return false;
        if (year && String(item.year || "") !== year) return false;
        if (ageRating && String(item.ageRating || item.contentRating || "").toLocaleLowerCase() !== ageRating) return false;
        return true;
      });
      if (sort === "title") filtered.sort((a: SearchRecord, b: SearchRecord) => String(a.title).localeCompare(String(b.title)));
      else if (sort === "rating") filtered.sort((a: SearchRecord, b: SearchRecord) => (numberOrUndefined(b.rating) || 0) - (numberOrUndefined(a.rating) || 0));
      else if (sort === "year") filtered.sort((a: SearchRecord, b: SearchRecord) => Number(b.year || 0) - Number(a.year || 0));
      const results = filtered.slice(0, limit);
      const nextOffset = page * 50;
      return NextResponse.json({
        results,
        total: anime.total,
        limit,
        offset,
        nextOffset,
        hasMore: anime.hasNextPage,
        query: rawQuery,
        sources: ["AniList"],
        unavailable: [],
        database: "AniList",
      }, {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
      });
    } catch (error) {
      console.error("AniList discovery failed; using Streamivio's bundled anime catalog", error);
      const results = fallback.slice(offset, offset + limit);
      return NextResponse.json({
        results,
        total: fallback.length,
        limit,
        offset,
        nextOffset: offset + results.length,
        hasMore: offset + results.length < fallback.length,
        query: rawQuery,
        sources: ["Streamivio Library"],
        unavailable: ["AniList"],
        database: "bundled-json-fallback",
      }, {
        headers: { "Cache-Control": "public, max-age=20, s-maxage=60, stale-while-revalidate=180" },
      });
    }
  }

  const apiBase=(process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL||"").replace(/\/+$/,"");
  let mediaResults:SearchRecord[]=[];
  let catalogDatabase="bundled-json-fallback";
  const unavailable:string[]=[];
  const sources:string[]=[];

  if(scope!=="games"){
    mediaResults=catalog.filter(item=>matchesScope(item.type,scope)).map(item=>({
      ...item,name:item.title,poster_url:(item as any).poster||null,
      contentRating:(item as any).ageRating||null,playback_available:false
    }));
    if(apiBase){
      try{
        const upstream=new URL("/catalog",apiBase);
        if(rawQuery&&!popular)upstream.searchParams.set("q",rawQuery);
        if(scope!=="all")upstream.searchParams.set("type",scope==="movies"?"movie":scope==="documentaries"?"documentary":scope);
        if(genre)upstream.searchParams.set("genre",params.get("genre")||"");
        if(country)upstream.searchParams.set("country",country);
        if(year)upstream.searchParams.set("year",year);
        upstream.searchParams.set("sort",sort);
        upstream.searchParams.set("limit","250");
        upstream.searchParams.set("offset","0");
        const response=await fetch(upstream.toString(),{
          headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(4500)
        });
        if(response.ok){
          const payload=await response.json();
          if(Array.isArray(payload.results)){
            const pythonResults:SearchRecord[]=payload.results.map((item:SearchRecord)=>({
              ...item,name:item.title||item.name,year:item.year==null?"":String(item.year),
              ageRating:item.age_rating||item.ageRating||null,contentRating:item.age_rating||item.contentRating||null,
              poster:item.poster_url||item.poster||null,poster_url:item.poster_url||item.poster||null,
              playback_available:Boolean(item.playback_available)
            }));
            // Keep valid bundled-only titles when a Python catalog query misses them; merge by provider ID/title.
            mediaResults=mergeUnique(pythonResults,mediaResults);
            catalogDatabase="python-json+bundled-fallback";
          }else unavailable.push("Streamivio catalog");
        }else unavailable.push("Streamivio catalog");
      }catch(error){
        console.error("Streamivio catalog search failed; using bundled catalog",error);
        unavailable.push("Streamivio catalog API");
      }
    }
  }

  // Include anime in the unified All category as well as the dedicated Anime shelf.
  if (scope === "all") {
    try {
      const anime = await fetchAniList(popular ? "" : rawQuery, 1, 50);
      mediaResults = mergeUnique(mediaResults, anime.results);
      sources.push("AniList");
      catalogDatabase += "+AniList";
    } catch (error) {
      console.error("AniList unified search is unavailable", error);
      unavailable.push("AniList");
    }
  }

  // Enrich discovery shelves with IMDb's current popular lists, not just the small bundled starter catalog.
  if(popular&&apiBase&&(scope==="all"||scope==="movies"||scope==="tv"||scope==="documentaries")){
    const types:("movie"|"tv"|"documentary")[]=scope==="movies"?["movie"]:scope==="tv"?["tv"]:scope==="documentaries"?["documentary"]:["movie","tv","documentary"];
    const remotePopular=await Promise.all(types.map(async kind=>{
      try{return {kind,results:await fetchPopular(apiBase,kind),failed:false};}
      catch(error){console.error("IMDb popular catalog failed",kind,error);return {kind,results:[],failed:true};}
    }));
    const externalPopular=remotePopular.flatMap(entry=>{
      if(entry.failed){unavailable.push(entry.kind==="movie"?"IMDb popular movies":"IMDb popular TV");return [];}
      return entry.results.filter((item:SearchRecord)=>{
        if(genre&&!textList(item.genres).some(value=>compact(value)===genre))return false;
        if(country&&!countryMatches(item,country))return false;
        if(year&&String(item.year||"")!==year)return false;
        if(ageRating&&String(item.ageRating||"").toLocaleLowerCase()!==ageRating)return false;
        return true;
      });
    });
    mediaResults=mergeUnique(mediaResults,externalPopular);
    sources.push("IMDb popular titles");
    catalogDatabase=apiBase?"python-json+IMDb-popular":"bundled-json-fallback";
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

  const externalEligible=!popular&&Boolean(apiBase)&&rawQuery.length>=2&&
    (scope==="all"||scope==="movies"||scope==="tv"||scope==="documentaries");
  if(scope!=="games")sources.push("Streamivio Library");
  if(scope==="all"||scope==="games")sources.push("Games catalog");
  if(externalEligible&&apiBase){
    const types:("movie"|"tv"|"documentary")[]=scope==="movies"?["movie"]:scope==="tv"?["tv"]:scope==="documentaries"?["documentary"]:["movie","tv","documentary"];
    const remote=await Promise.all(types.map(async kind=>{
      try{return {kind,results:await fetchExternal(apiBase,rawQuery,kind),failed:false};}
      catch(error){console.error("External title search failed",kind,error);return {kind,results:[],failed:true};}
    }));
    const external=remote.flatMap(entry=>{
      if(entry.failed){unavailable.push(entry.kind==="movie"?"IMDb movie search":"IMDb TV search");return [];}
      return entry.results.filter((item: SearchRecord)=>{
        if(genre&&!textList(item.genres).some(value=>compact(value)===genre))return false;
        if(country&&!countryMatches(item,country))return false;
        if(year&&String(item.year||"")!==year)return false;
        if(ageRating&&String(item.ageRating||"").toLocaleLowerCase()!==ageRating)return false;
        return true;
      });
    });
    combined=mergeUnique(combined,external);
    sources.push("IMDb title search");
  }

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
