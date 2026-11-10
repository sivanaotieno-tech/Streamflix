"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

export function FirebaseSessionSync() {
  useEffect(() => {
    let active = true;
    let lastToken: string | null = null;
    let clearSent = false;
    let auth: ReturnType<typeof getFirebaseAuth> | null = null;
    try {
      auth = getFirebaseAuth();
    } catch {
      return;
    }
    if (!auth) return;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        if (clearSent) return;
        clearSent = true;
        lastToken = null;
        try {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clear: true }),
            cache: "no-store",
          });
        } catch {}
        return;
      }

      clearSent = false;
      try {
        const token = await user.getIdToken();
        if (!active || token === lastToken) return;
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
          cache: "no-store",
        });
        if (response.ok) lastToken = token;
      } catch (error) {
        console.error("Streamivio session refresh failed", error);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return null;
}
