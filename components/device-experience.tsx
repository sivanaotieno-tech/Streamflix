"use client";

import { useEffect } from "react";

const TV_USER_AGENT = /smart-tv|smarttv|hbbtv|appletv|googletv|android tv|aftb|aftt|tizen|web0s|webos|netcast|bravia|viera|roku|fire tv/i;
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export default function DeviceExperience() {
  useEffect(() => {
    const root = document.documentElement;
    const userAgent = navigator.userAgent || "";
    const isTV = TV_USER_AGENT.test(userAgent);

    root.classList.toggle("sv-tv-mode", isTV);
    root.classList.toggle("sv-touch-mode", navigator.maxTouchPoints > 0);

    if (!isTV) return;

    const getFocusable = () =>
      Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 &&
          style.visibility !== "hidden" && style.display !== "none";
      });

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;

      if (["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key)) {
        if (window.history.length > 1) {
          event.preventDefault();
          window.history.back();
        }
        return;
      }

      const directions: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const direction = directions[event.key];
      if (!direction) return;

      const elements = getFocusable();
      if (!elements.length) return;

      const active = document.activeElement as HTMLElement | null;
      const current = active && elements.includes(active) ? active : null;
      if (!current) {
        event.preventDefault();
        elements[0].focus();
        return;
      }

      const origin = current.getBoundingClientRect();
      const ox = origin.left + origin.width / 2;
      const oy = origin.top + origin.height / 2;
      const [dx, dy] = direction;
      let best: HTMLElement | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of elements) {
        if (candidate === current) continue;
        const rect = candidate.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - ox;
        const y = rect.top + rect.height / 2 - oy;
        const primary = x * dx + y * dy;
        if (primary <= 2) continue;
        const cross = Math.abs(x * dy - y * dx);
        const score = primary + cross * 2.25;
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      if (best) {
        event.preventDefault();
        best.focus({ preventScroll: true });
        best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.classList.remove("sv-tv-mode", "sv-touch-mode");
    };
  }, []);

  return null;
}
