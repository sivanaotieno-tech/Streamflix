import {NextRequest,NextResponse} from "next/server";
import {jellyfinAuthHeader} from "../auth";

const ITEM_ID=/^[A-Za-z0-9-]{1,128}$/;

export async function GET(request:NextRequest){
  const id=request.nextUrl.searchParams.get("id")||"";
  if(!ITEM_ID.test(id)){
    return NextResponse.json({error:"Invalid Jellyfin item ID"},{status:400});
  }

  const url=String(process.env.JELLYFIN_URL||"").replace(/\/+$/,"");
  const apiKey=String(process.env.JELLYFIN_API_KEY||"");
  if(!url||!apiKey){
    return NextResponse.json({error:"Jellyfin is not configured"},{status:503});
  }

  try{
    const upstream=await fetch(
      `${url}/Items/${encodeURIComponent(id)}/Images/Primary`,
      {headers:jellyfinAuthHeader(apiKey),cache:"no-store",signal:request.signal}
    );
    if(!upstream.ok){
      return NextResponse.json({error:"Jellyfin image is unavailable"},{status:upstream.status});
    }
    const headers=new Headers({
      "Cache-Control":"private, max-age=3600",
      "Content-Type":upstream.headers.get("Content-Type")||"image/jpeg"
    });
    const length=upstream.headers.get("Content-Length");
    if(length)headers.set("Content-Length",length);
    return new NextResponse(upstream.body,{status:upstream.status,headers});
  }catch(error){
    console.error("Jellyfin image request failed",error);
    return NextResponse.json({error:"Jellyfin image is unavailable"},{status:502});
  }
}
