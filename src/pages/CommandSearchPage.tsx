import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function CommandSearchPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [mail, setMail] = useState<any[]>([]);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);

  const term = useMemo(() => q.trim(), [q]);

  async function run() {
    if (!term) return;
    setStatus("Searching…");
    setMail([]); setBulletins([]); setGuides([]);

    // Mail (your own scope via v_my_mail_messages)
    try {
      const m = await supabase.from("v_my_mail_messages").select("thread_key,from_name,to_name,subject_norm,body,created_at_norm").ilike("body", `%${term}%`).limit(25);
      if (!m.error) setMail(m.data ?? []);
    } catch {}

    // State bulletins (state 789 best-effort)
    try {
      const b = await supabase.from("state_bulletins").select("id,state_code,title,body,created_at").ilike("body", `%${term}%`).limit(25);
      if (!b.error) setBulletins(b.data ?? []);
    } catch {}

    // Guides (best-effort: entries table)
    try {
      const g = await supabase.from("guide_section_entries").select("id,alliance_code,section_id,title,body,created_at").or(`title.ilike.%${term}%,body.ilike.%${term}%`).limit(25);
      if (!g.error) setGuides(g.data ?? []);
    } catch {}

    setStatus("");
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>🔎 Command Search</h2>
      <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>

      <div className="zombie-card" style={{ padding: 14, borderRadius: 16, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 260 }} />
          <button type="button" onClick={() => void run()}>Search</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Mail</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {mail.map((x, i) => (
              <div key={i} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{x.subject_norm || "(no subject)"} • {x.from_name}</div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, whiteSpace: "pre-wrap" }}>{String(x.body || "").slice(0, 240)}</div>
              </div>
            ))}
            {!mail.length ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>State Bulletins</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {bulletins.map((x) => (
              <div key={x.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{x.title}</div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, whiteSpace: "pre-wrap" }}>{String(x.body || "").slice(0, 240)}</div>
              </div>
            ))}
            {!bulletins.length ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Guides</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {guides.map((x) => (
              <div key={x.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{x.alliance_code} • {x.title}</div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, whiteSpace: "pre-wrap" }}>{String(x.body || "").slice(0, 240)}</div>
              </div>
            ))}
            {!guides.length ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
