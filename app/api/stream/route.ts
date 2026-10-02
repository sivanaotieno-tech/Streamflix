import {NextRequest,NextResponse} from "next/server";

const IA_META="https://archive.org/metadata/";

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("identifier");
  if(!id) return NextResponse.json({error:"Missing identifier"},{status:400});

  try{
    const r=await fetch(IA_META+encodeURIComponent(id),{next:{revalidate:3600}});
    if(!r.ok) return NextResponse.json({error:"Archive item unavailable"},{status:r.status});
    const data=await r.json();
    const files=Array.isArray(data.files)?data.files:[];
    const candidates=files
      .filter((f:any)=>typeof f?.name==="string")
      .filter((f:any)=>/\.(mp4|m4v|webm)$/i.test(f.name))
      .filter((f:any)=>Number(f.size||0)>0)
      .sort((a:any,b:any)=>{
        const rank=(f:any)=>/\.mp4$/i.test(f.name)?0:/\.m4v$/i.test(f.name)?1:2;
        return rank(a)-rank(b);
      });

    const file=candidates[0];
    if(!file) return NextResponse.json({error:"No browser-playable video file found"},{status:404});

    const url="https://archive.org/download/"+encodeURIComponent(id)+"/"+file.name.split("/").map(encodeURIComponent).join("/");
    return NextResponse.json({
      identifier:id,
      url,
      type:/\.webm$/i.test(file.name)?"webm":"mp4",
      name:file.name,
      size:file.size||null
    });
  }catch{
    return NextResponse.json({error:"Streaming source unavailable"},{status:502});
  }
}
