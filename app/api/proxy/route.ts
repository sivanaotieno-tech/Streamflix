import {NextRequest,NextResponse} from "next/server";

const ALLOWED_HOSTS=new Set([
  "archive.org",
  "ia800000.us.archive.org",
  "ia800100.us.archive.org",
  "ia800200.us.archive.org",
  "ia800300.us.archive.org",
  "iptv-org.github.io"
]);

export async function GET(req:NextRequest){
  const raw=req.nextUrl.searchParams.get("url");
  if(!raw)return NextResponse.json({error:"Missing stream URL"},{status:400});

  let target:URL;
  try{target=new URL(raw)}catch{return NextResponse.json({error:"Invalid stream URL"},{status:400})}

  const allowed=[...ALLOWED_HOSTS].some(host=>target.hostname===host||target.hostname.endsWith("."+host));
  if(!allowed)return NextResponse.json({error:"Stream host is not allowed"},{status:403});

  try{
    const headers=new Headers();
    const range=req.headers.get("range");
    if(range)headers.set("Range",range);
    const upstream=await fetch(target.toString(),{headers,redirect:"follow"});
    if(!upstream.ok && upstream.status!==206)return new NextResponse("Upstream stream unavailable",{status:upstream.status});

    const out=new Headers();
    for(const key of ["content-type","content-length","content-range","accept-ranges","cache-control"]){
      const value=upstream.headers.get(key);
      if(value)out.set(key,value);
    }
    out.set("Content-Disposition","inline");
    return new NextResponse(upstream.body,{status:upstream.status,headers:out});
  }catch{
    return NextResponse.json({error:"Server streaming unavailable"},{status:502});
  }
}
