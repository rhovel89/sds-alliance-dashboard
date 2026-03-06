import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AwaitingApprovalPage() {
  const nav = useNavigate();
  const [uid, setUid] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then((r) => setUid(String(r.data?.user?.id || "")));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    nav("/", { replace: true });
  }

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <div style={{
        border: "1px solid rgba(176,18,27,0.35)",
        background: "rgba(176,18,27,0.12)",
        borderRadius: 14,
        padding: 12
      }}>
        <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>
          🧟 Awaiting Owner Approval
        </div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          Your account is signed in but not yet assigned to an alliance/state.
        </div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
          User: <code>{uid || "(unknown)"}</code>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Go Dashboard</button>
        <button className="zombie-btn" type="button" onClick={() => window.location.reload()}>Refresh</button>
        <button className="zombie-btn" type="button" onClick={signOut}>Sign Out</button>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
        Once Owner approves you, refresh and you’ll gain access automatically (RLS enforced).
      </div>
    </div>
  );
}
