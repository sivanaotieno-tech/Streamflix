import {NextRequest,NextResponse} from "next/server";
import {catalog} from "../../../data/catalog";

const isSafeHttps=(value:string)=>{try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}};

export async function GET(request:NextRequest){
  const id=(request.nextUrl.searchParams.get("id")||"").trim();
  const title=(request.nextUrl.searchParams.get("title")||"").trim();
  const type=(request.nextUrl.searchParams.get("type")||"movie").trim().toLowerCase();
  if(!id&&!title)return NextResponse.json({available:false,error:"Provide a catalog id or title."},{status:400});
  const local=catalog.find((item:any)=>String(item.id)===id);
  const localUrl=typeof (local as any)?.video_url==="string"?(local as any).video_url:"";
  if(localUrl&&isSafeHttps(localUrl)){
    const path=new URL(localUrl).pathname.toLowerCase();
    const format=path.endsWith(".m3u8")?"hls":path.endsWith(".mp4")?"mp4":"external";
    return NextResponse.json({available:true,stream_url:localUrl,format,source:"configured-authorized-catalog"});
  }

  // Optional connection to Streamivio's own Python metadata/catalog service.
  // This route never scrapes, downloads, or proxies third-party media.
  const base=(process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL||"").replace(/\/$/,"");
  if(base&&local){
    try{
      const upstream=new URL("/playback",base);
      upstream.searchParams.set("id",id);
      const response=await fetch(upstream.toString(),{cache:"no-store",signal:AbortSignal.timeout(4500)});
      const data=await response.json();
      if(response.ok&&data.available&&typeof data.stream_url==="string"&&isSafeHttps(data.stream_url)){
        return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
      }
    }catch(error){console.error("Authorized playback API unavailable",error);}
  }
  return NextResponse.json({
    available:false,
    message:"No authorized direct stream is configured for this title. The player can use the embedded provider if a valid IMDb ID is available.",
  },{status:404,headers:{"Cache-Control":"no-store"}});
}
