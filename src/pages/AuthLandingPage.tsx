import React, { useState } from "react";
import { startOAuth } from "../lib/startOAuth";

export default function AuthLandingPage() {
  const [busy, setBusy] = useState<"" | "discord" | "google">("");
  const [msg, setMsg] = useState("");

  async function handle(provider: "discord" | "google") {
    try {
      setMsg("");
      setBusy(provider);
      await startOAuth(provider);
    } catch (e: any) {
      setMsg(String(e?.message || e || "Login failed"));
      setBusy("");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "linear-gradient(180deg, #0b1117 0%, #0f1720 100%)",
      }}
    >
      <div
        className="zombie-card"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.28)",
          borderRadius: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", opacity: 0.72 }}>
            STATE ALLIANCE DASHBOARD
          </div>
          <h1 style={{ margin: "8px 0 0 0", fontSize: 30, fontWeight: 950 }}>
            Sign in
          </h1>
          <div style={{ opacity: 0.78, marginTop: 8, lineHeight: 1.6 }}>
            Continue with Discord or Google.
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            className="zombie-btn"
            type="button"
            onClick={() => void handle("discord")}
            disabled={busy !== ""}
            style={{ padding: "12px 14px", fontWeight: 900 }}
          >
            {busy === "discord" ? "Connecting Discord…" : "Continue with Discord"}
          </button>

          <button
            className="zombie-btn"
            type="button"
            onClick={() => void handle("google")}
            disabled={busy !== ""}
            style={{ padding: "12px 14px", fontWeight: 900 }}
          >
            {busy === "google" ? "Connecting Google…" : "Continue with Google"}
          </button>
        </div>

        {msg ? (
          <div
            style={{
              border: "1px solid rgba(255,120,120,0.30)",
              background: "rgba(255,120,120,0.08)",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
            }}
          >
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
