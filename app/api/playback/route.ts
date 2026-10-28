import {NextRequest,NextResponse} from "next/server";
import {catalog} from "../../../data/catalog";

const isSafeHttps=(value:string)=>{try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}};
const normalize=(value:string)=>value.toLocaleLowerCase().replace(/[^a-z0-9]/g,"");

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const id=(params.get("id")||"").trim();
  const title=(params.get("title")||"").trim();
  const requestedType=(params.get("type")||"movie").trim().toLowerCase();
  if(!id&&!title)return NextResponse.json({available:false,error:"Provide a catalog id or title."},{status:400});
  const local=catalog.find((item:any)=>String(item.id)===id);
  const localUrl=typeof (local as any)?.video_url==="string"?(local as any).video_url:"";
  if(localUrl&&isSafeHttps(localUrl)){
    const path=new URL(localUrl).pathname.toLowerCase();
    const format=path.endsWith(".m3u8")?"hls":path.endsWith(".mp4")?"mp4":"external";
    return NextResponse.json({available:true,stream_url:localUrl,format,source:"configured-authorized-catalog"});
  }

  const imdbId=String(params.get("imdb_id")||(local as any)?.imdb_id||(local as any)?.imdbId||(local as any)?.imdbID||"");
  const metadataBase=(process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL||"").replace(/\/+$/,"");
  if(metadataBase&&id){
    try{
      const directUrl=new URL("/playback",metadataBase);
      directUrl.searchParams.set("id",id);
      const response=await fetch(directUrl.toString(),{cache:"no-store",signal:AbortSignal.timeout(4500)});
      const data=await response.json();
      if(response.ok&&data.available&&typeof data.stream_url==="string"&&isSafeHttps(data.stream_url)){
        return NextResponse.json({...data,source:"python-authorized-catalog"},{headers:{"Cache-Control":"no-store"}});
      }
    }catch(error){console.error("Python authorized playback lookup unavailable",error);}
  }

  const resolverBase=(process.env.STREAMIVIO_RESOLVER_URL||"").replace(/\/$/,"");
  if(resolverBase&&/^tt\d+$/i.test(imdbId)){
    try{
      const response=await fetch(resolverBase+"/stream/"+encodeURIComponent(imdbId),{cache:"no-store",signal:AbortSignal.timeout(4500)});
      const data=await response.json();
      if(response.ok&&data.available&&typeof data.stream_url==="string"&&isSafeHttps(data.stream_url)){
        return NextResponse.json({...data,source:"streamivio-authorized-resolver"},{headers:{"Cache-Control":"no-store"}});
      }
    }catch(error){console.error("Streamivio resolver unavailable",error);}
  }

  // Resolve a real IMDb ID using Streamivio's configured Python metadata API.
  // This builds an embed URL only; it does not extract or proxy provider streams.
  const metadataBase=(process.env.PYMOVIEDB_SERVICE_URL||process.env.PYMOVIEDB_API_URL||"").replace(/\/$/,"");
  const searchTitle=title||(local as any)?.title||"";
  if(metadataBase&&searchTitle.length>=2){
    try{
      const kind=(requestedType==="tv"||requestedType==="anime"||requestedType==="documentary"||requestedType==="kids"||requestedType==="reality")?"tv":"movie";
      const searchUrl=new URL("/search",metadataBase);
      searchUrl.searchParams.set("q",searchTitle);
      searchUrl.searchParams.set("type",kind);
      const response=await fetch(searchUrl.toString(),{cache:"no-store",signal:AbortSignal.timeout(5000)});
      if(response.ok){
        const payload=await response.json();
        const candidates=Array.isArray(payload.results)?payload.results:[];
        const normTitle=normalize(searchTitle);
        const exact=candidates.find((item:any)=>normalize(String(item.title||item.name||item.titleText||""))===normTitle);
        const found=exact||null;
        const foundId=String(found?.imdbID||found?.imdb_id||found?.imdbId||found?.id||"");
        if(/^tt\d+$/i.test(foundId)){
          const embedUrl=kind==="tv"
            ?"https://vidsrc.sh/embed/tv/"+encodeURIComponent(foundId)
            :"https://vidsrc.sh/embed/movie/"+encodeURIComponent(foundId);
          return NextResponse.json({available:true,format:"iframe",embed_url:embedUrl,imdb_id:foundId,source:"vidsrc-embed"});
        }
      }
    }catch(error){console.error("IMDb metadata lookup unavailable",error);}
  }
  return NextResponse.json({
    available:false,
    message:"No authorized direct stream or exact IMDb ID could be resolved. Add imdb_id and, for direct playback, an authorized video_url to this catalog item.",
  },{status:404,headers:{"Cache-Control":"no-store"}});
}
