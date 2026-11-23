"use client";
import {useEffect,useState} from "react";
export function ImdbPoster({title,year,className=""}:{title:string;year:string;className?:string}){
 const [poster,setPoster]=useState<string|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let stop=false;setPoster(null);setFailed(false);if(!/^\d{4}$/.test(year)){setFailed(true);return()=>{stop=true}}const p=new URLSearchParams({title,year});fetch("/api/poster?"+p.toString()).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(!stop&&typeof d?.poster==="string")setPoster(d.poster)}).catch(()=>{if(!stop)setFailed(true)});return()=>{stop=true}},[title,year]);
 if(poster&&!failed)return <img src={poster} alt={title+" poster"} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={className||"h-full w-full object-cover"} onError={()=>setFailed(true)}/>;
 return <div role="img" aria-label={title+" poster unavailable"} className={className+" flex h-full w-full items-center justify-center bg-gradient-to-br from-red-950 via-zinc-800 to-zinc-950 p-3 text-center font-bold text-zinc-200"}>{title}</div>;
}