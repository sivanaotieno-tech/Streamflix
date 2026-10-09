"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SubscriptionReturnPage() {
  const [session, setSession] = useState<string | null>(null);
  const [state, setState] = useState<"checking" | "active" | "pending" | "failed">("checking");
  const [message, setMessage] = useState("Verifying your payment directly with the payment provider…");

  useEffect(() => {
    const sessionFromUrl = new URLSearchParams(window.location.search).get("session");
    setSession(sessionFromUrl);
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (!sessionFromUrl) {
        setState("failed");
        setMessage("This checkout link is missing its session reference. Please return to subscriptions and try again.");
        return;
      }
      try {
        const response = await fetch(`/api/billing/status?session=${encodeURIComponent(sessionFromUrl)}`, { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        if (response.status === 404 || data.status === "not_found") {
          setState("failed");
          setMessage("We could not find this checkout session. Please start a new checkout.");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Verification is temporarily unavailable.");
        if (data.status === "active") {
          setState("active");
          setMessage("Payment verified! Your membership is active.");
          return;
        }
        if (data.status === "inactive") {
          setState("failed");
          setMessage("The payment was not completed. No membership has been activated.");
          return;
        }
        attempts += 1;
        setState("pending");
        setMessage("Payment is still pending. M-Pesa or your card provider may need a moment. This page will check again.");
        if (attempts < 12) timer = setTimeout(check, 3000);
      } catch {
        if (cancelled) return;
        attempts += 1;
        setState("pending");
        setMessage("We could not verify the payment yet. Please wait a moment; membership will not activate until the provider confirms payment.");
        if (attempts < 12) timer = setTimeout(check, 4000);
      }
    }

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const active = state === "active";
  const failed = state === "failed";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101010] px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#191919] p-7 text-center sm:p-10">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black ${active ? "bg-emerald-500/15 text-emerald-400" : failed ? "bg-red-500/15 text-red-400" : "bg-white/10 text-zinc-200"}`}>{active ? "✓" : failed ? "!" : "…"}</div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.3em] text-red-400">STREAMIVIO</p>
        <h1 className="mt-2 text-3xl font-black">{active ? "You're subscribed!" : failed ? "Payment not confirmed" : "Confirming your payment"}</h1>
        <p role="status" className="mt-4 text-sm leading-6 text-zinc-400">{message}</p>
        {state === "pending" && <p className="mt-3 text-xs text-zinc-500">Keep this page open briefly. A payment redirect is not proof of payment.</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {active ? <Link href="/" className="rounded-lg bg-[#e50914] px-5 py-3 font-bold">Start browsing</Link> : <Link href="/subscribe" className="rounded-lg bg-white px-5 py-3 font-bold text-black">{failed ? "Try again" : "Back to subscriptions"}</Link>}
          <Link href="/" className="rounded-lg border border-white/15 px-5 py-3 font-semibold">Return home</Link>
        </div>
      </section>
    </main>
  );
}
