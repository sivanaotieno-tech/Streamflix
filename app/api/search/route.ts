import {NextRequest,NextResponse} from "next/server";
import {catalog} from "../../data/catalog";
import {supabase,supabaseConfigured} from "../../../lib/supabase";

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
function normalizeRow(row:any){
  return {
    id:row.id,title:row.title,name:row.title,overview:row.overview||"",
    year:row.release_year==null?"":String(row.release_year),
    rating:row.rating==null?undefined:Number(row.rating),
    type:row.type,genres:row.genres||[],country:row.country||[],
    contentRating:row.age_rating||null,ageRating:row.age_rating||null,
    poster:row.poster_url||null,source:"Supabase Catalog",url:null
  };
}

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
  const sort=params.get("sort")==="year"?"release_year":params.get("sort")==="title"?"title":"rating";
  const limit=Math.min(100,Math.max(1,Number(params.get("limit")||60)));
  if(!SCOPES.includes(rawScope as Scope))return NextResponse.json({error:"Invalid catalog category"},{status:400});
  if(!popular&&(query.length<2||query.length>100))return NextResponse.json({error:"Search must be between 2 and 100 characters"},{status:400});
  const scope=rawScope as Scope;

  if(supabase&&supabaseConfigured){
    try{
      let db=supabase.from("titles").select("id,title,overview,release_year,rating,type,genres,country,age_rating,poster_url").eq("is_published",true);
      if(scope==="movies")db=db.eq("type","movie");
      else if(scope!=="all")db=db.eq("type",scope==="documentaries"?"documentary":scope);
      if(year){
        const yearNumber=Number(year);
        if(!Number.isInteger(yearNumber)||yearNumber<1888||yearNumber>2200)return NextResponse.json({error:"Invalid release year"},{status:400});
        db=db.eq("release_year",yearNumber);
      }
      if(ageRating)db=db.ilike("age_rating",ageRating);
      if(!popular){
        const safeQuery=query.replace(/[,%()]/g," ").replace(/\s+/g," ").trim();
        db=db.or("title.ilike.%"+safeQuery+"%,overview.ilike.%"+safeQuery+"%");
      }
      const {data,error}=await db.order(sort,{ascending:sort==="title",nullsFirst:false}).limit(limit);
      if(error)throw error;
      return NextResponse.json({results:(data||[]).map(normalizeRow),unavailable:[],database:"supabase"},
        {headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}});
    }catch(error){
      console.error("Supabase catalog query failed; using local fallback",error);
    }
  }

  let results=catalog.filter(item=>matchesScope(item.type,scope));
  if(genre)results=results.filter(item=>item.genres.some(value=>normalize(value)===genre));
  if(country)results=results.filter(item=>Array.isArray((item as any).country)&&(item as any).country.some((value:string)=>value.toLocaleLowerCase()===country));
  if(year)results=results.filter(item=>item.year===year);
  if(ageRating)results=results.filter(item=>String((item as any).ageRating||"").toLocaleLowerCase()===ageRating);
  if(!popular)results=results.filter(item=>[item.title,item.overview,item.year,item.type,...item.genres].join(" ").toLocaleLowerCase().includes(query));
  else results=[...results].sort((a,b)=>b.rating-a.rating);
  return NextResponse.json({results:results.slice(0,limit).map(item=>({...item,name:item.title,contentRating:(item as any).ageRating||null,country:(item as any).country||[]})),unavailable:[],database:"local-fallback"},
    {headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}});
}
