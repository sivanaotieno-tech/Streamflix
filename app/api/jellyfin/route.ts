import {NextResponse} from "next/server";
import {jellyfinAuthHeader} from "./auth";

const base=()=>String(process.env.JELLYFIN_URL||"").replace(/\/$/,"");
const token=()=>String(process.env.JELLYFIN_API_KEY||"");

function authHeaders(){
  return {
    Accept:"application/json",
    ...jellyfinAuthHeader(token())
  };
}

export async function GET(){
  const url=base();
  const apiKey=token();
  if(!url||!apiKey){
    return NextResponse.json(
      {configured:false,enabled:false,videos:[]},
      {status:200,headers:{"Cache-Control":"no-store"}}
    );
  }

  try{
    const r=await fetch(
      url+"/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&Fields=Overview,ProductionYear,PrimaryImageTag,CommunityRating,Genres,RunTimeTicks,Type&SortBy=DateCreated,SortName&SortOrder=Descending&Limit=100",
      {headers:authHeaders(),cache:"no-store",signal:AbortSignal.timeout(20_000)}
    );
    if(!r.ok) throw new Error("Jellyfin returned "+r.status);
    const data=await r.json();

    const videos=(data.Items||[])
      .filter((x:any)=>x?.Id&&x?.Name)
      .map((x:any)=>({
        id:String(x.Id),
        title:String(x.Name),
        overview:x.Overview||"",
        year:x.ProductionYear?String(x.ProductionYear):"",
        rating:Number(x.CommunityRating)||0,
        genres:Array.isArray(x.Genres)?x.Genres:[],
        runtime:x.RunTimeTicks?String(Math.round(x.RunTimeTicks/600_000_000))+" min":"",
        mediaType:x.Type||"",
        poster:x.ImageTags?.Primary
          ? "/api/jellyfin/image?id="+encodeURIComponent(String(x.Id))
          : "",
        streamUrl:"/api/jellyfin/stream?id="+encodeURIComponent(String(x.Id))
      }));

    return NextResponse.json(
      {configured:true,enabled:true,videos},
      {headers:{"Cache-Control":"no-store"}}
    );
  }catch(error){
    console.error("Jellyfin catalog request failed",error);
    return NextResponse.json(
      {configured:true,enabled:false,videos:[],error:error instanceof Error?error.message:"Jellyfin unavailable"},
      {status:502,headers:{"Cache-Control":"no-store"}}
    );
  }
}
