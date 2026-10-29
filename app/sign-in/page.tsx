"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

type Mode = "signup" | "signin";
type Stage = "email" | "code";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendWait, setResendWait] = useState(0);

  useEffect(() => {
    setNextPath(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  useEffect(() => {
    if (resendWait <= 0) return;
    const timer = window.setTimeout(() => setResendWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWait]);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, mode }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "We couldn't send your code.");
      setEmail(cleanEmail);
      setCode("");
      setStage("code");
      setResendWait(Number(data.resendAfterSeconds) || 60);
      setNotice(data.message || "Check your inbox for your six-digit verification code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email verification is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter all six digits from the email.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "The code could not be verified.");
      window.location.assign(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification is temporarily unavailable.");
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(229,9,20,.26), transparent 42%), radial-gradient(ellipse at 100% 100%, rgba(120,10,14,.24), transparent 44%)" }} />
      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-black/80 p-6 shadow-2xl shadow-red-950/30 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Streamivio
        </Link>

        <div className="mt-8 text-center">
          <Link href="/" className="text-4xl font-black tracking-[-.075em] text-[#e50914] sm:text-5xl">STREAMIVIO</Link>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{stage === "email" ? "Your next watch starts here." : "Check your email."}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            {stage === "email"
              ? "Sign in or create your free account using a secure, one-time email code. No password to remember."
              : <>We sent a six-digit code to <span className="font-semibold text-white">{email}</span>. Enter it below to continue.</>}
          </p>
        </div>

        {stage === "email" ? (
          <>
            <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} aria-pressed={mode === "signup"} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${mode === "signup" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"}`}>Create account</button>
              <button type="button" onClick={() => { setMode("signin"); setError(""); }} aria-pressed={mode === "signin"} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${mode === "signin" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"}`}>Sign in</button>
            </div>
            <form onSubmit={requestCode} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-zinc-200">
                Email address
                <span className="relative mt-2 block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="you@example.com" className="w-full rounded-xl border border-white/15 bg-[#131313] py-3.5 pl-11 pr-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                </span>
              </label>
              {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
              <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] px-5 py-3.5 font-extrabold transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
                {busy ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Sending code…</> : <>Email me a code <span aria-hidden="true">→</span></>}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={verifyCode} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-zinc-200">
              Six-digit verification code
              <input autoFocus required type="text" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" maxLength={6} placeholder="••••••" className="mt-2 w-full rounded-xl border-2 border-[#e50914]/70 bg-[#101010] px-4 py-4 text-center font-mono text-3xl font-black tracking-[.45em] text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20" />
            </label>
            {notice && <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm leading-5 text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
            {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={busy || code.length !== 6} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] px-5 py-3.5 font-extrabold transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
              {busy ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Verifying…</> : <><ShieldCheck className="h-5 w-5" /> Verify and continue</>}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <button type="button" onClick={() => { setStage("email"); setCode(""); setError(""); setNotice(""); }} className="text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-white">Use another email</button>
              <button type="button" disabled={busy || resendWait > 0} onClick={() => void requestCode()} className="font-semibold text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600">
                {resendWait > 0 ? `Resend in ${resendWait}s` : "Send a new code"}
              </button>
            </div>
            <p className="text-center text-xs leading-5 text-zinc-500">Codes expire after 10 minutes and stop working after five incorrect attempts. Never share your code with anyone.</p>
          </form>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-zinc-500">By continuing, you agree to use Streamivio respectfully. Membership payments are handled separately by the secure payment provider.</p>
      </section>
    </main>
  );
}
