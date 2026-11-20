"use client";

import { useEffect, useRef, useState } from "react";

export default function GTAInspiredVIPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [mission, setMission] = useState("Drive through the city — reach the checkpoint");
  const keys = useRef<Record<string, boolean>>({});
  const pos = useRef({ lane: 0, distance: 0, speed: 0 });

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault(); keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    let raf = 0; let last = 0;
    const draw = (time: number) => {
      const dt = Math.min((time-last)/1000 || 0, .05); last=time;
      const w=canvas.width, h=canvas.height, p=pos.current, k=keys.current;
      if (started && !cinematic) { if(k["arrowup"]||k["w"]) p.speed=Math.min(p.speed+42*dt,180); else p.speed=Math.max(p.speed-18*dt,0); if(k["arrowdown"]||k["s"]) p.speed=Math.max(p.speed-80*dt,0); if(k["arrowleft"]||k["a"]) p.lane=Math.max(p.lane-dt*1.4,-1); if(k["arrowright"]||k["d"]) p.lane=Math.min(p.lane+dt*1.4,1); p.distance+=p.speed*dt; }
      setSpeed(Math.round(p.speed));
      const horizon=h*.36, center=w/2;
      ctx.fillStyle="#7db6dc";ctx.fillRect(0,0,w,horizon);
      const grd=ctx.createLinearGradient(0,horizon,0,h);grd.addColorStop(0,"#5b665b");grd.addColorStop(1,"#18231f");ctx.fillStyle=grd;ctx.fillRect(0,horizon,w,h-horizon);
      ctx.fillStyle="#293039";ctx.beginPath();ctx.moveTo(center-w*.08,horizon);ctx.lineTo(center+w*.08,horizon);ctx.lineTo(w*.9,h);ctx.lineTo(w*.1,h);ctx.fill();
      ctx.strokeStyle="#e4d8a3";ctx.lineWidth=4;ctx.setLineDash([28,26]);ctx.lineDashOffset=-(p.distance%54);ctx.beginPath();ctx.moveTo(center,horizon);ctx.lineTo(center,h);ctx.stroke();ctx.setLineDash([]);
      for(let side=0;side<2;side++){for(let i=0;i<8;i++){let z=(i/8+p.distance*.002)%1;let y=horizon+z*(h-horizon);let x=center+(side?1:-1)*(w*.12+z*w*.36);let bh=(.05+z*.22)*h;ctx.fillStyle=side?"#42545c":"#354850";ctx.fillRect(x,y-bh,w*.045*z+8,bh);ctx.fillStyle="#f6ce82";for(let n=0;n<3;n++)ctx.fillRect(x+8+n*12,y-bh+12,5,9);}}
      // player car
      const carX=center+p.lane*w*.24, carY=h*.78;
      ctx.fillStyle="#101418";ctx.fillRect(carX-w*.055,carY,w*.11,h*.12);ctx.fillStyle="#d5e4ec";ctx.fillRect(carX-w*.04,carY+h*.018,w*.08,h*.055);ctx.fillStyle="#ba3341";ctx.fillRect(carX-w*.045,carY+h*.09,w*.025,h*.015);ctx.fillRect(carX+w*.02,carY+h*.09,w*.025,h*.015);
      // checkpoint marker
      const cp=Math.max(0,1000-(p.distance%1000));ctx.fillStyle="#ffe27a";ctx.font="bold 18px sans-serif";ctx.fillText("CHECKPOINT "+Math.round(cp)+" m",24,36);
      ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(16,h-74,240,54);ctx.fillStyle="#fff";ctx.font="bold 22px sans-serif";ctx.fillText(Math.round(p.speed)+" KM/H",28,h-42);ctx.font="13px sans-serif";ctx.fillText("Prototype city drive",28,h-23);
      if(p.distance>1000 && p.distance%1000<2){setMission("Checkpoint reached! Continue driving.");}
      raf=requestAnimationFrame(draw);
    }; raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
  },[started,cinematic]);

  return <main style={{minHeight:"100vh",background:"#080b10",color:"#f4f5f7",padding:"24px",fontFamily:"system-ui"}}>
    <div style={{maxWidth:1100,margin:"auto"}}><a href="/games" style={{color:"#aab5c5"}}>← Games</a>
    <h1 style={{fontSize:32,margin:"12px 0 4px"}}>Grand Theft Auto VI — City Drive Prototype</h1><p style={{color:"#aab5c5"}}>Fan-made browser prototype inspired by publicly available footage. Not the original GTA VI.</p>
    <div style={{position:"relative",border:"1px solid #303b48",borderRadius:14,overflow:"hidden",background:"#18232b"}}>
    <canvas ref={canvasRef} width={1100} height={620} style={{display:"block",width:"100%",height:"auto"}}/>
    {!started&&<div style={{position:"absolute",inset:0,background:"rgba(4,8,13,.78)",display:"grid",placeContent:"center",textAlign:"center",padding:20}}><h2>Vice-inspired city drive</h2><p>Start the prototype. Drive using WASD or arrow keys.</p><button onClick={()=>setStarted(true)} style={{padding:"12px 24px",background:"#e6c66a",color:"#111",border:0,borderRadius:8,fontWeight:700,cursor:"pointer"}}>Start driving</button></div>}
    {cinematic&&<div style={{position:"absolute",inset:0,background:"#000",display:"grid",placeContent:"center"}}><p>Cinematic reference</p><button onClick={()=>setCinematic(false)}>Return to driving</button></div>}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:16}}><button onClick={()=>setStarted(true)} style={{padding:12,borderRadius:8}}>Resume</button><button onClick={()=>{pos.current={lane:0,distance:0,speed:0};setStarted(true)}} style={{padding:12,borderRadius:8}}>Restart</button><button onClick={()=>setCinematic(!cinematic)} style={{padding:12,borderRadius:8}}>Toggle cinematic overlay</button></div>
    <section style={{marginTop:18,padding:18,background:"#111821",borderRadius:12}}><h3>Mission</h3><p>{mission}</p><p>Speed: {speed} km/h · Distance: {Math.floor(pos.current.distance)} m</p><p style={{color:"#aab5c5"}}>Controls: W/↑ accelerate · S/↓ brake · A/← steer left · D/→ steer right</p></section>
    <p style={{fontSize:13,color:"#8793a3",marginTop:18}}>This is a newly coded lightweight prototype, not the Rockstar game or the PS5 preload. The linked preload repo contains Git LFS pointer files and claims that cannot be independently validated; its executable files are not browser-compatible. Do not run them.</p></div></main>;
}
