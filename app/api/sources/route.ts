import {NextRequest,NextResponse} from "next/server";

export async function GET(req:NextRequest){
  const base=process.env.OMSS_API_URL;
  const id=req.nextUrl.searchParams.get("id");
  if(!base||!id) return NextResponse.json({sources:[],configured:Boolean(base)});
  try{
    const r=await fetch(base.replace(/\/$/,"")+"/v1/movies/"+encodeURIComponent(id)+"?platform=web",{next:{revalidate:300}});
    const data=await r.json();
    return NextResponse.json(data,{status:r.status});
  }catch{
    return NextResponse.json({sources:[],error:"OMSS backend unavailable"},{status:502});
  }
}
