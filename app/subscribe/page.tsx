"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Plan = "plus" | "premium";
type Period = "monthly" | "yearly";

const plans = [
  { id: "plus" as const, name: "Streamivio Plus", monthly: 299, yearly: 2990, description: "A great way to support independent, properly licensed entertainment.", features: ["Browse the full catalog", "Ad-free experience where supported", "Personal watchlist", "Premium titles when licensed"] },
  { id: "premium" as const, name: "Streamivio Premium", monthly: 499, yearly: 4990, description: "The highest membership tier as the authorized catalog grows.", features: ["Everything in Plus", "Premium catalog access when licensed", "Priority access to new member features", "Support for independent creators"] },
];

export default function SubscribePage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [plan, setPlan] = useState<Plan>("plus");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [membership, setMembership] = useState<{status:string;plan?:string;expiresAt?:string|null}|null>(null);

  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setMembership(data))
      .catch(() => setMembership(null));
  }, []);

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, phoneNumber, plan, period }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout is temporarily unavailable.");
      setBusy(false);
    }
  }

  const selectedPlan = plans.find((item) => item.id === plan)!;
  const amount = period === "monthly" ? selectedPlan.monthly : selectedPlan.yearly;

  return (
    <main className="min-h-screen bg-[#141414] px-4 pb-16 pt-5 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="site-nav -mx-4 mb-12 flex items-center justify-between px-4 py-4 sm:-mx-8 sm:px-8">
          <Link href="/" className="text-2xl font-black tracking-[-.06em] text-[#e50914]">STREAMIVIO</Link>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">← Back to browse</Link>
        </nav>

        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.3em] text-red-400">Membership</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Entertainment, your way.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Choose a membership to support Streamivio as its authorized movie and creator catalog grows.
            Browsing remains free. Premium playback will only be enabled for content Streamivio is licensed to offer.
          </p>
          {membership?.status === "active" && <div className="mt-6 rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Your Streamivio membership is active{membership.expiresAt ? ` until ${new Date(membership.expiresAt).toLocaleDateString()}` : ""}.
          </div>}
        </section>

        <div className="my-8 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button type="button" onClick={() => setPeriod("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold ${period === "monthly" ? "bg-white text-black" : "text-zinc-300"}`}>Monthly</button>
            <button type="button" onClick={() => setPeriod("yearly")} className={`rounded-full px-5 py-2 text-sm font-semibold ${period === "yearly" ? "bg-white text-black" : "text-zinc-300"}`}>Yearly <span className="ml-1 text-emerald-400">Save</span></button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {plans.map((item) => (
            <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`rounded-lg border p-6 text-left transition sm:p-8 ${plan === item.id ? "border-red-500 bg-[#202020] ring-1 ring-red-500/40" : "border-white/10 bg-[#1b1b1b] hover:border-white/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">{item.name}</h2>
                  <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan === item.id ? "bg-red-500 text-white" : "bg-white/10 text-zinc-300"}`}>{plan === item.id ? "Selected" : "Choose"}</span>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-black">KSh {(period === "monthly" ? item.monthly : item.yearly).toLocaleString("en-KE")}</span>
                <span className="text-sm text-zinc-500">/{period === "monthly" ? "month" : "year"}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {item.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-red-400">✓</span>{feature}</li>)}
              </ul>
            </button>
          ))}
        </div>

        <section className="mx-auto mt-8 max-w-2xl rounded-lg border border-white/10 bg-[#1b1b1b] p-5 sm:p-8">
          <h2 className="text-xl font-bold">Continue to secure checkout</h2>
          <p className="mt-2 text-sm text-zinc-400">Selected: {selectedPlan.name} · {period} · KSh {amount.toLocaleString("en-KE")}. Checkout offers the payment methods enabled for your IntaSend account, including M-Pesa and cards when enabled.</p>
          <form onSubmit={startCheckout} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-300">First name <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={80} autoComplete="given-name" className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-red-500" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Last name <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={80} autoComplete="family-name" className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-red-500" /></label>
            <label className="grid gap-2 text-sm text-zinc-300 sm:col-span-2">Email address <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-red-500" placeholder="you@example.com" /></label>
            <label className="grid gap-2 text-sm text-zinc-300 sm:col-span-2">Phone number (optional) <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} maxLength={20} autoComplete="tel" className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-red-500" placeholder="+254712345678" /></label>
            {error && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={busy} type="submit" className="rounded-lg bg-[#e50914] px-5 py-3 font-bold transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{busy ? "Connecting to secure checkout…" : `Continue · KSh ${amount.toLocaleString("en-KE")}`}</button>
          </form>
          <p className="mt-4 text-xs leading-5 text-zinc-500">Payments are processed by IntaSend. A successful return to this site does not itself activate membership: Streamivio checks the payment status with the provider. Membership is valid for the selected period and must be renewed manually unless automatic renewal is separately enabled by the payment provider.</p>
        </section>
      </div>
    </main>
  );
}
