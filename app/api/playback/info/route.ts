import {NextRequest,NextResponse} from "next/server";

const validContentId=(value:string)=>/^tt\d{5,10}$/i.test(value)||/^\d{1,12}$/.test(value);
const jsonHeaders={"Cache-Control":"public, s-maxage=300, stale-while-revalidate=60"};

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const id=(params.get("id")||"").trim();
  const type=(params.get("type")||"movie").trim().toLowerCase();
  const season=(params.get("season")||"").trim();
  const episode=(params.get("episode")||"").trim();

  if(!validContentId(id)){
    return NextResponse.json({available:false,error:"Provide a valid IMDb ID (tt…) or numeric TMDB ID."},{status:400,headers:jsonHeaders});
  }
  if(type!=="movie"&&type!=="tv"){
    return NextResponse.json({available:false,error:"Type must be movie or tv."},{status:400,headers:jsonHeaders});
  }
  if((season&&!episode)||(!season&&episode)||((season||episode)&&type!=="tv")||
     (season&&(!/^\d{1,3}$/.test(season)||Number(season)<1))||
     (episode&&(!/^\d{1,4}$/.test(episode)||Number(episode)<1))){
    return NextResponse.json({available:false,error:"Season and episode must be positive integers, supplied together for TV titles only."},{status:400,headers:jsonHeaders});
  }

  const path=type==="movie"
    ?"/info/movie/"+encodeURIComponent(id)+".json"
    :(season&&episode
      ?"/info/tv/"+encodeURIComponent(id)+"/"+season+"/"+episode+".json"
      :"/info/tv/"+encodeURIComponent(id)+".json");
  try{
    const upstream=await fetch("https://vidsrc.sh"+path,{
      headers:{Accept:"application/json"},
      cache:"no-store",
      signal:AbortSignal.timeout(6500)
    });
    const payload=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      return NextResponse.json({
        available:false,
        status_code:upstream.status,
        message:typeof payload.message==="string"?payload.message:(upstream.status===404?"This title or episode is not available according to VidSrc.":"VidSrc information lookup failed.")
      },{status:upstream.status===404?404:502,headers:jsonHeaders});
    }
    return NextResponse.json({available:true,...payload},{status:200,headers:jsonHeaders});
  }catch(error){
    console.error("VidSrc information lookup unavailable",error);
    return NextResponse.json({available:false,message:"VidSrc information is temporarily unavailable."},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
