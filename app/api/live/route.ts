import {NextResponse} from "next/server";

const CHANNELS="https://iptv-org.github.io/api/channels.json";
const STREAMS="https://iptv-org.github.io/api/streams.json";

export async function GET(){
  try{
    const [c,s]=await Promise.all([
      fetch(CHANNELS,{next:{revalidate:21600}}).then(r=>r.json()),
      fetch(STREAMS,{next:{revalidate:21600}}).then(r=>r.json())
    ]);
    const streamsById=new Map<string,any[]>();
    for(const stream of s){
      if(!stream.channel||!stream.url) continue;
      const arr=streamsById.get(stream.channel)||[];
      arr.push(stream);
      streamsById.set(stream.channel,arr);
    }
    const channels=c.filter((x:any)=>x.id&&x.name&&streamsById.has(x.id)).slice(0,100).map((x:any)=>({
      id:x.id,name:x.name,logo:x.logo||null,country:x.country||null,language:x.languages?.[0]||null,
      streams:streamsById.get(x.id)||[]
    }));
    return NextResponse.json({channels});
  }catch{
    return NextResponse.json({error:"Live TV source unavailable"},{status:502});
  }
}
