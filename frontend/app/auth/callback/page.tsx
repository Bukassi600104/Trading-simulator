/**
 * Auth Callback Page — Terminal Zero
 * Handles Supabase email confirmation redirect.
 * Supabase redirects here after user clicks the email confirmation link.
 */
"use client";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function handleCallback() {
      if (!supabase) {
        // No Supabase — fallback mode, just go to landing
        router.replace("/landing");
        return;
      }

      // Supabase JS v2 automatically parses the URL hash/code and
      // fires onAuthStateChange with SIGNED_IN when the session is ready.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            // Sync with backend and redirect to onboarding
            const ok = await checkAuth();
            if (ok) {
              router.replace("/onboarding");
            } else {
              setStatus("error");
              setErrorMsg("Account confirmed but backend sync failed. Please try logging in.");
            }
          }
        }
      );
      unsubscribe = () => subscription.unsubscribe();

      // Also try getting the current session immediately (in case already confirmed)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const ok = await checkAuth();
        if (ok) {
          router.replace("/onboarding");
          return;
        }
      }

      // Timeout fallback — if nothing happens in 10s, show error
      setTimeout(() => {
        setStatus("error");
        setErrorMsg("Confirmation timed out. Please try logging in directly.");
      }, 10000);
    }

    handleCallback();
    return () => { unsubscribe?.(); };
  }, [checkAuth, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {status === "loading" ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid rgba(17,212,115,0.2)",
              borderTopColor: "#11d473",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ color: "#64748b", fontSize: "15px", margin: 0 }}>
            Confirming your account…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ textAlign: "center", maxWidth: "360px", padding: "0 24px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(244,63,94,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: 700, margin: "0 0 10px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
            {errorMsg}
          </p>
          <a
            href="/landing?auth=login"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "linear-gradient(135deg, #11d473, #0fa866)",
              borderRadius: "8px",
              color: "#020617",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Go to Login
          </a>
        </div>
      )}
    </div>
  );
}
