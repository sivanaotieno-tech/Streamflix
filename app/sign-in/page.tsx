"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

type Mode = "signup" | "signin";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already uses this email. Choose Log in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/user-not-found": "No account was found for that email. Create an account first.",
    "auth/wrong-password": "The password is incorrect. Try again or reset it.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
    "auth/network-request-failed": "The internet connection failed. Check your connection and retry.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and retry.",
    "auth/unauthorized-domain": "This website domain is not approved in Firebase yet. Add streamivio.com to Firebase Authentication's authorized domains.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication yet.",
  };
  return messages[code] || (error instanceof Error ? error.message : "Sign-in could not be completed. Please try again.");
}

async function createServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Your account was created, but Streamivio could not start your secure session. Please log in again.");
  }
}

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nextPath, setNextPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setNextPath(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const auth = getFirebaseAuth();
      const cleanEmail = email.trim().toLowerCase();
      const credential = mode === "signup"
        ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
        : await signInWithEmailAndPassword(auth, cleanEmail, password);
      await createServerSession(credential.user);
      window.location.assign(nextPath);
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setGoogleBusy(true);
    setError("");
    setNotice("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(getFirebaseAuth(), provider);
      await createServerSession(credential.user);
      window.location.assign(nextPath);
    } catch (err) {
      setError(friendlyAuthError(err));
      setGoogleBusy(false);
    }
  }

  async function resetPassword() {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter your email address first, then choose Forgot password.");
      return;
    }
    setResetBusy(true);
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), cleanEmail);
      setNotice("If an account exists for that email, Firebase has sent a password-reset link.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setResetBusy(false);
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
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
            {mode === "signup" ? "Create your account." : "Welcome back."}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            Sign up or log in with your email and password, or continue securely with Google.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
          <button type="button" onClick={() => { setMode("signup"); setError(""); setNotice(""); }} aria-pressed={mode === "signup"} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${mode === "signup" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"}`}>Create account</button>
          <button type="button" onClick={() => { setMode("signin"); setError(""); setNotice(""); }} aria-pressed={mode === "signin"} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${mode === "signin" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"}`}>Log in</button>
        </div>

        <button
          type="button"
          disabled={googleBusy || busy}
          onClick={() => void continueWithGoogle()}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-5 py-3.5 font-bold text-[#171717] transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {googleBusy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : (
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.38 37.98 46.98 31.84 46.98 24.55Z"/>
              <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
            </svg>
          )}
          {googleBusy ? "Connecting to Google…" : "Continue with Google"}
        </button>

        <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.2em] text-zinc-600">
          <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submitCredentials} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-zinc-200">
            Email address
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="you@example.com" className="w-full rounded-xl border border-white/15 bg-[#131313] py-3.5 pl-11 pr-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
            </span>
          </label>

          <label className="block text-sm font-semibold text-zinc-200">
            Password
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : 1} maxLength={128} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} className="w-full rounded-xl border border-white/15 bg-[#131313] py-3.5 pl-11 pr-12 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </span>
          </label>

          {mode === "signin" && <div className="text-right"><button type="button" disabled={resetBusy} onClick={() => void resetPassword()} className="text-xs font-semibold text-zinc-400 underline underline-offset-4 hover:text-white disabled:opacity-50">{resetBusy ? "Sending reset link…" : "Forgot password?"}</button></div>}

          {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}

          <button disabled={busy || googleBusy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] px-5 py-3.5 font-extrabold transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Please wait…</> : <><ShieldCheck className="h-5 w-5" /> {mode === "signup" ? "Create free account" : "Log in"}</>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-5 text-zinc-500">Your account is secured by Firebase Authentication. Never share your password or verification messages with anyone.</p>
      </section>
    </main>
  );
}
