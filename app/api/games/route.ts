import {NextRequest,NextResponse} from "next/server";
import {supabase,supabaseConfigured} from "../../../lib/supabase";

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const query=(params.get("q")||"").trim().replace(/[,%()]/g," ").replace(/\s+/g," ");
  const popular=params.get("popular")==="1";
  const limit=Math.min(100,Math.max(1,Number(params.get("limit")||60)));
  if(!supabase||!supabaseConfigured){
    return NextResponse.json({results:[],database:"supabase",error:"Games catalog is not connected. Configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel."},{status:503});
  }
  if(!popular&&query.length<2){
    return NextResponse.json({results:[],database:"supabase",error:"Search must be at least 2 characters."},{status:400});
  }
  try{
    let db=supabase.from("games").select("id,title,overview,release_year,rating,platforms,genres,developer,publisher,age_rating,cover_url,official_url").eq("is_published",true);
    if(!popular)db=db.or("title.ilike.%"+query+"%,overview.ilike.%"+query+"%,developer.ilike.%"+query+"%,publisher.ilike.%"+query+"%");
    const {data,error}=await db.order("rating",{ascending:false,nullsFirst:false}).limit(limit);
    if(error)throw error;
    const results=(data||[]).map((row:any)=>({
      id:row.id,title:row.title,name:row.title,overview:row.overview||"",
      year:row.release_year==null?"":String(row.release_year),
      rating:row.rating==null?undefined:Number(row.rating),
      genres:row.genres||[],platforms:row.platforms||[],developer:row.developer||null,
      publisher:row.publisher||null,contentRating:row.age_rating||null,
      poster:row.cover_url||null,url:row.official_url||null,source:"Supabase Games"
    }));
    return NextResponse.json({results,database:"supabase"},{headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}});
  }catch(error){
    console.error("Supabase games query failed",error);
    return NextResponse.json({results:[],database:"supabase",error:"The games catalog could not be loaded."},{status:500});
  }
}
