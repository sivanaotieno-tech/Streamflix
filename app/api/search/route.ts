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

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const query=(params.get("q")||"").trim().toLocaleLowerCase();
  const rawScope=params.get("scope")||"all";
  const popular=params.get("popular")==="1";
  const genre=(params.get("genre")||"").replace(/_/g," ").toLocaleLowerCase();
  if(!SCOPES.includes(rawScope as Scope))return NextResponse.json({error:"Invalid catalog category"},{status:400});
  if(!popular&&(query.length<2||query.length>100))return NextResponse.json({error:"Search must be between 2 and 100 characters"},{status:400});
  const scope=rawScope as Scope;
  let results=catalog.filter(item=>matchesScope(item.type,scope));
  if(genre)results=results.filter(item=>item.genres.some(value=>value.toLocaleLowerCase()===genre));
  if(!popular){
    results=results.filter(item=>[item.title,item.overview,item.year,item.type,...item.genres].join(" ").toLocaleLowerCase().includes(query));
  }else{
    results=[...results].sort((a,b)=>b.rating-a.rating);
  }
  return NextResponse.json({
    results:results.map(item=>({...item,url:null,imdbId:undefined})),
    unavailable:[]
  },{headers:{"Cache-Control":"public, max-age=60, s-maxage=300, stale-while-revalidate=600"}});
}
