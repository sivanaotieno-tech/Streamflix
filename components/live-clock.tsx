"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-[120] rounded-full border border-white/10 bg-black/55 px-3 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-sky-200 sm:text-xs">
        {new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now)}
      </span>
    </div>
  );
}
