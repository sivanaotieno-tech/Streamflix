import {NextResponse} from "next/server";

const base=()=>String(process.env.JELLYFIN_URL||"").replace(/\/$/,"");
const token=()=>String(process.env.JELLYFIN_API_KEY||"");

function authHeaders(){
  return {
    Accept:"application/json",
    "X-Emby-Token":token()
  };
}

export async function GET(){
  const url=base();
  const apiKey=token();
  if(!url||!apiKey){
    return NextResponse.json({enabled:false,videos:[]},{status:200,headers:{"Cache-Control":"no-store"}});
  }

  try{
    const r=await fetch(
      url+"/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&Fields=Overview,ProductionYear,PrimaryImageTag&SortBy=DateCreated,SortName&SortOrder=Descending&Limit=100",
      {headers:authHeaders(),cache:"no-store"}
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
        poster:x.ImageTags?.Primary
          ? url+"/Items/"+encodeURIComponent(String(x.Id))+"/Images/Primary?tag="+encodeURIComponent(String(x.ImageTags.Primary))+"&api_key="+encodeURIComponent(apiKey)
          : "",
        streamUrl:url+"/Videos/"+encodeURIComponent(String(x.Id))+"/stream?Static=true&api_key="+encodeURIComponent(apiKey)
      }));

    return NextResponse.json(
      {enabled:true,videos},
      {headers:{"Cache-Control":"no-store"}}
    );
  }catch(error){
    return NextResponse.json(
      {enabled:false,videos:[],error:error instanceof Error?error.message:"Jellyfin unavailable"},
      {status:502,headers:{"Cache-Control":"no-store"}}
    );
  }
}
