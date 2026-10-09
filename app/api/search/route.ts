import {NextRequest,NextResponse} from "next/server";

const KITSU="https://kitsu.io/api/edge/anime";
const SEARCH_SCOPES=["all","movies","anime","tv"] as const;
type SearchScope=(typeof SEARCH_SCOPES)[number];
type SearchResult={
  id:string; imdbId?:string; title:string; overview:string; poster:string|null;
  year:string; rating:number; source:"PyMovieDb"|"Kitsu"; url:string;
};

async function fetchJson(url:string){
  const response=await fetch(url,{
    headers:{"User-Agent":"Streamivio/1.0"},cache:"no-store",
    signal:AbortSignal.timeout(12_000)
  });
  if(!response.ok) throw new Error(`Search source returned ${response.status}`);
  return response.json();
}

function mapIMDbResults(items:unknown):SearchResult[]{
  return (Array.isArray(items)?items:[])
    .filter((item:any)=>item?.id&&item?.name)
    .map((item:any)=>({
      id:`imdb-${item.id}`, imdbId:String(item.id), title:String(item.name), overview:"",
      poster:typeof item.poster==="string"&&item.poster!=="image_not_found"?item.poster:null,
      year:item.year?String(item.year):"", rating:Number(item.rating?.ratingValue||item.rating)||0,
      source:"PyMovieDb" as const, url:`/title/${encodeURIComponent(String(item.id))}`
    }));
}

function mapKitsuAnime(items:unknown):SearchResult[]{
  return (Array.isArray(items)?items:[])
    .filter((item:any)=>item?.id&&item?.attributes)
    .map((item:any)=>({
      id:`anime-${item.id}`,
      title:String(item.attributes.canonicalTitle||item.attributes.titles?.en||item.attributes.titles?.en_jp||item.attributes.slug||"Untitled anime"),
      overview:String(item.attributes.synopsis||""),
      poster:item.attributes.posterImage?.large||item.attributes.posterImage?.medium||item.attributes.posterImage?.small||null,
      year:item.attributes.startDate?String(item.attributes.startDate).slice(0,4):"",
      rating:Number(item.attributes.averageRating)/10||0, source:"Kitsu" as const,
      url:`https://kitsu.io/anime/${encodeURIComponent(String(item.attributes.slug||item.id))}`
    }));
}

async function searchIMDb(query:string,titleType:"movie"|"tv"){
  const value=process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL;
  const serviceUrl=value?.replace(/\/+$/,"");
  if(!serviceUrl) throw new Error("PyMovieDb service is not configured");
  const params=new URLSearchParams({q:query,type:titleType});
  const endpoint=new URL(`search?${params.toString()}`,`${serviceUrl}/`);
  const data=await fetchJson(endpoint.toString());
  return mapIMDbResults(data.results);
}

async function searchAnime(query:string){
  const params=new URLSearchParams({"filter[text]":query,"page[limit]":"12","sort":"-userCount"});
  const data=await fetchJson(`${KITSU}?${params}`);
  return mapKitsuAnime(data.data);
}
async function popularAnime(){
  const params=new URLSearchParams({sort:"-userCount","page[limit]":"20"});
  const data=await fetchJson(`${KITSU}?${params}`);
  return mapKitsuAnime(data.data);
}

export async function GET(request:NextRequest){
  const query=request.nextUrl.searchParams.get("q")?.trim()||"";
  const scope=request.nextUrl.searchParams.get("scope")||"all";
  const popular=request.nextUrl.searchParams.get("popular")==="1";
  if(popular&&scope!=="anime") return NextResponse.json({error:"Popular mode is only available for anime"},{status:400});
  if(!popular&&(query.length<2||query.length>100)) return NextResponse.json({error:"Search must be between 2 and 100 characters"},{status:400});
  if(!SEARCH_SCOPES.includes(scope as SearchScope)) return NextResponse.json({error:"Invalid search category"},{status:400});

  const sources:{name:string;search:()=>Promise<SearchResult[]>}[]=[];
  if(scope==="all"||scope==="movies") sources.push({name:"Movies",search:()=>searchIMDb(query,"movie")});
  if(scope==="all"||scope==="tv") sources.push({name:"TV",search:()=>searchIMDb(query,"tv")});
  if(scope==="all"||scope==="anime") sources.push({name:"Anime",search:popular?popularAnime:()=>searchAnime(query)});

  const settled=await Promise.allSettled(sources.map(source=>source.search()));
  const results:SearchResult[]=[]; const unavailable:string[]=[];
  settled.forEach((result,index)=>{
    if(result.status==="fulfilled") results.push(...result.value);
    else { unavailable.push(sources[index].name); console.error(`${sources[index].name} search failed`,result.reason); }
  });
  return NextResponse.json({results,unavailable},{headers:{"Cache-Control":"no-store"}});
}
