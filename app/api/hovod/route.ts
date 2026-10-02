import {NextResponse} from "next/server";

type HovodVideo={
  id:string;
  title:string;
  description?:string;
  poster?:string;
  year?:string|number;
  playbackId?:string;
  embedUrl?:string;
};

function getVideos():HovodVideo[]{
  const raw=process.env.STREAMFLIX_HOVOD_VIDEOS||"[]";
  try{
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    const base=(process.env.HOVOD_PUBLIC_URL||"").replace(/\/$/,"");
    return parsed
      .filter((x:any)=>x&&x.id&&x.title&&x.playbackId)
      .map((x:any)=>({
        id:String(x.id),
        title:String(x.title),
        description:x.description?String(x.description):"",
        poster:x.poster?String(x.poster):"",
        year:x.year?String(x.year):"",
        playbackId:String(x.playbackId),
        embedUrl:x.embedUrl?String(x.embedUrl):base+"/embed/"+encodeURIComponent(String(x.playbackId))
      }));
  }catch{
    return [];
  }
}

export async function GET(){
  return NextResponse.json({
    enabled:Boolean(process.env.HOVOD_PUBLIC_URL),
    videos:getVideos()
  },{
    headers:{"Cache-Control":"no-store"}
  });
}
