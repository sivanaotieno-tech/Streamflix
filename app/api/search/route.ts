import {NextRequest,NextResponse} from "next/server";
import {catalog} from "../../data/catalog";

const SCOPES=["all","movies","anime","tv","documentaries","kids","reality"] as const;
type Scope=(typeof SCOPES)[number];

function matchesScope(type:string,scope:Scope){
  if(scope==="all")return true;
  if(scope==="movies")return type==="movie";
  if(scope==="tv")return type==="tv";
  if(scope==="anime")return type==="anime";
  if(scope==="documentaries")return type==="documentary";
  if(scope==="kids")return type==="kids";
  return type==="reality";
}
const normalize=(value:string)=>value.toLocaleLowerCase().replace(/[^a-z0-9]/g,"");

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const rawQuery=(params.get("q")||"").trim();
  const query=rawQuery.toLocaleLowerCase();
  const rawScope=params.get("scope")||"all";
  const popular=params.get("popular")==="1";
  const genre=normalize(params.get("genre")||"");
  const country=(params.get("country")||"").trim().toLocaleLowerCase();
  const year=(params.get("year")||"").trim();
  const ageRating=(params.get("age_rating")||"").trim().toLocaleLowerCase();
  const sort=params.get("sort")==="year"?"year":params.get("sort")==="title"?"title":"rating";
  const limit=Math.min(100,Math.max(1,Number(params.get("limit")||60)));
  if(!SCOPES.includes(rawScope as Scope))return NextResponse.json({error:"Invalid catalog category"},{status:400});
  if(!popular&&(query.length<2||query.length>100))return NextResponse.json({error:"Search must be between 2 and 100 characters"},{status:400});
  if(year&&(!/^[0-9]{4}$/.test(year)||Number(year)<1888||Number(year)>2200))return NextResponse.json({error:"Invalid release year"},{status:400});

  const scope=rawScope as Scope;
  // Production uses the Python JSON catalog as the source of truth. Local TypeScript data is a dev fallback.
  const apiBase=(process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL||"").replace(/\/$/,"");
  if(apiBase){
    try{
      const upstream=new URL("/catalog",apiBase);
      if(query&&!popular)upstream.searchParams.set("q",rawQuery);
      if(scope!=="all")upstream.searchParams.set("type",scope==="movies"?"movie":scope==="documentaries"?"documentary":scope);
      if(genre)upstream.searchParams.set("genre",params.get("genre")||"");
      if(country)upstream.searchParams.set("country",params.get("country")||"");
      if(year)upstream.searchParams.set("year",year);
      upstream.searchParams.set("sort",sort);
      upstream.searchParams.set("limit",String(limit));
      upstream.searchParams.set("offset","0");
      const response=await fetch(upstream.toString(),{headers:{"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(5000)});
      if(response.ok){
        const payload=await response.json();
        let results=Array.isArray(payload.results)?payload.results:[];
        if(ageRating)results=results.filter((item:any)=>String(item.age_rating||"").toLocaleLowerCase()===ageRating);
        return NextResponse.json({results:results.map((item:any)=>({
          ...item,name:item.title,year:item.year==null?"":String(item.year),
          ageRating:item.age_rating||null,contentRating:item.age_rating||null,
          poster:item.poster_url||null,poster_url:item.poster_url||null,
          playback_available:Boolean(item.playback_available)
        })),unavailable:[],database:"python-json"},{
          headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}
        });
      }
    }catch(error){
      console.error("Python catalog API unavailable; using bundled development fallback",error);
    }
  }

  let results=catalog.filter(item=>matchesScope(item.type,scope));
  if(genre)results=results.filter(item=>item.genres.some(value=>normalize(value)===genre));
  if(country)results=results.filter(item=>Array.isArray((item as any).country)&&(item as any).country.some((value:string)=>value.toLocaleLowerCase()===country));
  if(year)results=results.filter(item=>item.year===year);
  if(ageRating)results=results.filter(item=>String((item as any).ageRating||"").toLocaleLowerCase()===ageRating);
  if(!popular)results=results.filter(item=>[item.title,item.overview,item.year,item.type,...item.genres].join(" ").toLocaleLowerCase().includes(query));
  if(sort==="title")results=[...results].sort((a,b)=>a.title.localeCompare(b.title));
  else if(sort==="year")results=[...results].sort((a,b)=>Number(b.year)-Number(a.year));
  else results=[...results].sort((a,b)=>b.rating-a.rating);
  return NextResponse.json({results:results.slice(0,limit).map(item=>({...item,name:item.title,contentRating:(item as any).ageRating||null,country:(item as any).country||[],poster_url:(item as any).poster||null,playback_available:false})),unavailable:[],database:"bundled-json-fallback"},
    {headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}});
}
