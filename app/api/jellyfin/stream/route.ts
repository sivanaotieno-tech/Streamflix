import {NextRequest,NextResponse} from "next/server";
import {jellyfinAuthHeader} from "../auth";

const ITEM_ID=/^[A-Za-z0-9-]{1,128}$/;

function jellyfinConfig(){
  return {
    url:String(process.env.JELLYFIN_URL||"").replace(/\/+$/,""),
    apiKey:String(process.env.JELLYFIN_API_KEY||"")
  };
}

async function streamVideo(request:NextRequest,method:"GET"|"HEAD"){
  const id=request.nextUrl.searchParams.get("id")||"";
  if(!ITEM_ID.test(id)){
    return NextResponse.json({error:"Invalid Jellyfin item ID"},{status:400});
  }

  const {url,apiKey}=jellyfinConfig();
  if(!url||!apiKey){
    return NextResponse.json({error:"Jellyfin is not configured"},{status:503});
  }

  try{
    const headers=new Headers(jellyfinAuthHeader(apiKey));
    const range=request.headers.get("range");
    const ifRange=request.headers.get("if-range");
    if(range)headers.set("Range",range);
    if(ifRange)headers.set("If-Range",ifRange);

    const upstream=await fetch(
      `${url}/Videos/${encodeURIComponent(id)}/stream?Static=true`,
      {method,headers,cache:"no-store",redirect:"follow",signal:request.signal}
    );
    const responseHeaders=new Headers();
    for(const name of [
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
      "Content-Type",
      "Last-Modified",
      "ETag"
    ]){
      const value=upstream.headers.get(name);
      if(value)responseHeaders.set(name,value);
    }
    responseHeaders.set("Cache-Control","private, no-store");
    if(!upstream.ok&&upstream.status!==206){
      console.error("Jellyfin stream request failed",upstream.status);
      return NextResponse.json(
        {error:`Jellyfin stream request failed (${upstream.status})`},
        {status:upstream.status}
      );
    }
    return new NextResponse(method==="HEAD"?null:upstream.body,{
      status:upstream.status,
      headers:responseHeaders
    });
  }catch(error){
    console.error("Jellyfin stream is unavailable",error);
    return NextResponse.json({error:"Jellyfin stream is unavailable"},{status:502});
  }
}

export async function GET(request:NextRequest){
  return streamVideo(request,"GET");
}

export async function HEAD(request:NextRequest){
  return streamVideo(request,"HEAD");
}
