"use client";

import { useEffect } from "react";

export default function OfflineSupport() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Streamivio offline setup failed:", error);
      });
    }
  }, []);
  return null;
}
