"use client";

import { useEffect } from "react";
import { onIdTokenChanged, type Auth } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

export default function FirebaseSessionSync() {
  useEffect(() => {
    let active = true;
    let hadVerifiedUser = false;
    let auth: Auth;
    try {
      auth = getFirebaseAuth();
    } catch {
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!active) return;
      if (!user || !user.emailVerified) {
        if (hadVerifiedUser || user) {
          hadVerifiedUser = false;
          void fetch("/api/auth/signout", { method: "POST", cache: "no-store" }).catch(() => {});
        }
        return;
      }

      hadVerifiedUser = true;
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/auth/firebase/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          cache: "no-store",
        });
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
