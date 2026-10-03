import {NextResponse} from "next/server";

const base=()=>String(process.env.PEERTUBE_URL||"").replace(/\/$/,"");
const token=()=>String(process.env.PEERTUBE_API_TOKEN||"");

export async function GET(){
  const url=base();
  if(!url) return NextResponse.json({enabled:false,videos:[]},{status:200,headers:{"Cache-Control":"no-store"}});
  try{
    const headers:Record<string,string>={"Accept":"application/json"};
    if(token()) headers.Authorization="Bearer "+token();
    const r=await fetch(url+"/api/v1/videos?count=100&sort=-publishedAt&nsfw=false",{headers,cache:"no-store"});
    if(!r.ok) throw new Error("PeerTube returned "+r.status);
    const data=await r.json();
    const videos=(data.data||[]).filter((x:any)=>x?.uuid&&x?.name).map((x:any)=>({
      id:String(x.uuid),
      title:String(x.name),
      overview:x.description||"",
      year:x.publishedAt?String(x.publishedAt).slice(0,4):"",
      poster:x.thumbnailPath ? (x.thumbnailPath.startsWith("http")?x.thumbnailPath:url+x.thumbnailPath) : "",
      streamUrl:url+"/videos/embed/"+encodeURIComponent(String(x.uuid))+"?autoplay=1&title=0&warningTitle=0&peertubeLink=0",
      embedUrl:url+"/videos/embed/"+encodeURIComponent(String(x.uuid))+"?autoplay=1&title=0&warningTitle=0&peertubeLink=0"
    }));
    return NextResponse.json({enabled:true,videos},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return NextResponse.json({enabled:false,videos:[],error:error instanceof Error?error.message:"PeerTube unavailable"},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
