import type {CSSProperties} from "react";

type StreamivioLogoProps={className?:string;style?:CSSProperties};

export function StreamivioLogo({className="",style}:StreamivioLogoProps){
  return (
    <span
      className={`inline-flex select-none items-center whitespace-nowrap font-black uppercase leading-none tracking-[-0.075em] ${className}`}
      style={style}
      aria-label="Streamivio"
    >
      <span className="text-[#e50914]">STREAM</span>
      <span className="text-white">IVIO</span>
    </span>
  );
}
