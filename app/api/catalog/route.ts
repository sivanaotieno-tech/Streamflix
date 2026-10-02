import {NextRequest,NextResponse} from "next/server";

const TV="https://api.tvmaze.com";
const J="https://api.jikan.moe/v4";
const IA="https://archive.org/advancedsearch.php";

export async function GET(req:NextRequest){
  const s=req.nextUrl.searchParams.get("source")||"archive";
  const p=req.nextUrl.searchParams.get("path")||"";
  try{
    const base=s==="tvmaze"?TV:s==="jikan"?J:IA;
    const url=s==="archive"?base+"?"+p.replace(/^\?/,""):base+p;
    const r=await fetch(url,{headers:{"User-Agent":"Streamflix/1.0"},next:{revalidate:3600}});
    return NextResponse.json(await r.json(),{status:r.status});
  }catch{
    return NextResponse.json({error:"Source unavailable"},{status:502});
  }
}
