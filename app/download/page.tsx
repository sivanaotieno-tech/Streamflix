"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, Check, Copy, Download,
  Smartphone, Tablet, Tv, Laptop, ShieldCheck, Wifi, Play, ExternalLink
} from "lucide-react";

const APP_URL = "https://streamivio-1r94nmgql-sivanaotieno-techs-projects.vercel.app/";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Device = "android" | "iphone" | "computer" | "tv";

const devices = [
  { id: "android" as Device, name: "Android phones & tablets", detail: "Install Streamivio from your browser.", icon: Smartphone, instructions: ["Open this page in Chrome.", "Tap Install app if the prompt appears, or open the browser menu.", "Choose Install app or Add to Home screen.", "Launch Streamivio from your home screen."] },
  { id: "iphone" as Device, name: "iPhone & iPad", detail: "Add Streamivio to your Home Screen.", icon: Tablet, instructions: ["Open this page in Safari.", "Tap the Share button.", "Choose Add to Home Screen.", "Tap Add, then open Streamivio from your Home Screen."] },
  { id: "computer" as Device, name: "Windows, Mac & Linux", detail: "Install the web app for an app-like experience.", icon: Laptop, instructions: ["Open this page in Chrome or Edge.", "Select the install icon in the address bar, or open the browser menu.", "Choose Install Streamivio.", "Open it from your desktop or applications list."] },
  { id: "tv" as Device, name: "Smart TVs & streaming devices", detail: "Open Streamivio in your TV's web browser.", icon: Tv, instructions: ["Connect your TV to the internet.", "Open the TV's web browser.", "Visit the Streamivio app address shown below.", "Bookmark the page for quick access. Use your remote to navigate."] },
];

export default function DownloadPage() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [selected, setSelected] = useState<Device>("android");
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "Download Streamivio";
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!promptEvent) {
      document.getElementById("install-guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy the Streamivio app link:", APP_URL);
    }
  }

  const activeDevice = devices.find((device) => device.id === selected) ?? devices[0];
  const ActiveIcon = activeDevice.icon;

  return (
    <main className="min-h-screen overflow-hidden bg-[#070d17] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[38%] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-[110px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <a href={APP_URL} className="flex items-center gap-3" aria-label="Open Streamivio">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><Play className="h-5 w-5 fill-current" /></span>
          <span className="text-lg font-black tracking-[0.16em]">STREAMIVIO</span>
        </a>
        <a href={APP_URL} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-sky-300/40 hover:text-white">
          Open app <ArrowUpRight className="h-4 w-4" />
        </a>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pt-20">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
          <ArrowDownToLine className="h-4 w-4" /> Streamivio for every screen
        </div>
        <h1 className="text-5xl font-black tracking-[-0.06em] sm:text-7xl md:text-8xl">DOWNLOAD<span className="text-sky-400">.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Take your entertainment with you. Install Streamivio on your phone, tablet or computer, or open it on your Smart TV.
        </p>

        <div className="mx-auto mt-9 flex max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <button onClick={installApp} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-sky-400 px-7 py-4 font-bold text-slate-950 shadow-[0_12px_50px_rgba(56,189,248,0.2)] transition hover:bg-sky-300">
            {installed ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            {installed ? "Streamivio is installed" : promptEvent ? "Install Streamivio" : "How to install"}
          </button>
          <button onClick={copyLink} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 font-semibold text-white transition hover:bg-white/[0.08]">
            {copied ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
            {copied ? "Link copied" : "Copy app link"}
          </button>
        </div>
        {!promptEvent && !installed && <p className="mt-3 text-xs text-slate-500">If automatic installation is unavailable, choose your device below for step-by-step instructions.</p>}
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Choose your device</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Get Streamivio on your device</h2>
          </div>
          <span className="hidden text-xs text-slate-500 sm:block">One destination · Multiple screens</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {devices.map((device) => {
            const Icon = device.icon;
            const active = selected === device.id;
            return <button key={device.id} onClick={() => setSelected(device.id)} className={`rounded-2xl border p-5 text-left transition ${active ? "border-sky-300/60 bg-sky-300/10 shadow-[0_12px_45px_rgba(14,165,233,0.08)]" : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]"}`}>
              <span className={`mb-5 grid h-12 w-12 place-items-center rounded-xl ${active ? "bg-sky-300 text-slate-950" : "bg-white/10 text-slate-200"}`}><Icon className="h-6 w-6" /></span>
              <span className="block font-bold">{device.name}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-400">{device.detail}</span>
              <span className={`mt-5 inline-flex items-center gap-2 text-xs font-bold ${active ? "text-sky-200" : "text-slate-500"}`}>{active ? "Selected" : "View instructions"} <ArrowUpRight className="h-3.5 w-3.5" /></span>
            </button>;
          })}
        </div>

        <div id="install-guide" className="mt-5 grid scroll-mt-8 gap-5 rounded-3xl border border-white/10 bg-[#0c1726]/90 p-6 sm:p-8 md:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><ActiveIcon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Installation guide</p>
                <h3 className="mt-1 text-xl font-bold">{activeDevice.name}</h3>
              </div>
            </div>
            <ol className="mt-7 space-y-4">
              {activeDevice.instructions.map((instruction, index) => <li key={instruction} className="flex gap-4 text-sm leading-6 text-slate-300">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-sky-300/25 bg-sky-300/10 text-xs font-bold text-sky-200">{index + 1}</span>
                {instruction}
              </li>)}
            </ol>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/20 p-5">
            <div>
              <p className="text-sm font-bold">Your Streamivio app address</p>
              <p className="mt-2 break-all rounded-lg bg-black/30 p-3 text-xs leading-5 text-sky-200">{APP_URL}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">Use this address in your browser. The installable web app uses the same Streamivio service and account.</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <a href={APP_URL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-100">Open Streamivio <ExternalLink className="h-4 w-4" /></a>
              {promptEvent && <button onClick={installApp} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-5 py-3 text-sm font-bold text-sky-100 hover:bg-sky-300/20"><Download className="h-4 w-4" /> Install now</button>}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><ShieldCheck className="h-5 w-5 text-sky-300" /><h3 className="mt-4 font-bold">Your existing account</h3><p className="mt-2 text-sm leading-6 text-slate-400">Use the same Streamivio service. Sign-in and account features remain on the main app.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><Wifi className="h-5 w-5 text-sky-300" /><h3 className="mt-4 font-bold">Web app installation</h3><p className="mt-2 text-sm leading-6 text-slate-400">The install option depends on browser and device support. Some devices use Add to Home Screen instead.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><Tv className="h-5 w-5 text-sky-300" /><h3 className="mt-4 font-bold">TV apps are in development</h3><p className="mt-2 text-sm leading-6 text-slate-400">Native store releases for Android TV, Fire TV, Samsung, LG and Apple TV are not published yet. Use the TV browser for now.</p></div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-7 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Streamivio. One experience, every screen.
      </footer>
    </main>
  );
}
