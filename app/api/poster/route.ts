import { NextRequest, NextResponse } from "next/server";
export const revalidate = 86400;
const norm=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
export async function GET(req:NextRequest){
 const title=(req.nextUrl.searchParams.get("title")||"").trim(),year=(req.nextUrl.searchParams.get("year")||"").trim();
 if(!title||title.length>160||!/^\d{4}$/.test(year))return NextResponse.json({poster:null},{status:400});
 try{
  const q=encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g,""));
  const r=await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${q}.json`,{headers:{Accept:"application/json"},next:{revalidate:86400},signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw new Error("suggestion unavailable");
  const d=await r.json(),match=(Array.isArray(d?.d)?d.d:[]).find((x:any)=>typeof x?.l==="string"&&norm(x.l)===norm(title)&&String(x.y||"")===year&&/^tt\d+$/.test(x.id||x.i?.id||""));
  const id=match?.id||match?.i?.id;
  const poster=id?`https://api.streamx.qzz.io/img/poster/large/${id}/img`:null;
  return NextResponse.json({poster},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
 }catch{return NextResponse.json({poster:null});}
}