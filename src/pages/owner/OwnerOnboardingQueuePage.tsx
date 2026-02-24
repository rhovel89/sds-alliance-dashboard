import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Req = {
  id: string;
  created_at: string;
  state_code: string;
  alliance_code: string;
  alliance_id: string | null;
  requester_user_id: string | null;
  player_name: string;
  game_name: string;
  discord_name: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  provisioned: boolean;
};

function tpl(str: string, r: Req) {
  return str
    .replaceAll("{{player_name}}", r.player_name || r.game_name || "Player")
    .replaceAll("{{game_name}}", r.game_name || r.player_name || "Player")
    .replaceAll("{{alliance_code}}", r.alliance_code)
    .replaceAll("{{state_code}}", r.state_code);
}

export default function OwnerOnboardingQueuePage() {
  const [stateCode, setStateCode] = useState("789");
  const [rows, setRows] = useState<Req[]>([]);
  const [status, setStatus] = useState("");

  const [sendWelcome, setSendWelcome] = useState(true);
  const [subjectTpl, setSubjectTpl] = useState("Welcome to {{alliance_code}}!");
  const [bodyTpl, setBodyTpl] = useState(
`Welcome {{player_name}}!

You have been provisioned for alliance {{alliance_code}} in state {{state_code}}.

Open your dashboard:
- /me
- /mail-v2

— State Alliance Dashboard`
  );

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("onboarding_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);

  async function reject(r: Req) {
    const ok = confirm(`Reject request for ${r.player_name || r.game_name || r.requester_user_id}?`);
    if (!ok) return;
    setStatus("Rejecting…");
    const up = await supabase.from("onboarding_requests").update({ status: "rejected" }).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function approveAndProvision(r: Req) {
    const subj = tpl(subjectTpl, r);
    const body = tpl(bodyTpl, r);

    setStatus("Provisioning…");
    const res = await supabase.rpc("provision_onboarding_request", {
      p_request_id: r.id,
      p_send_welcome: sendWelcome,
      p_subject: subj,
      p_body: body,
    });

    if (res.error) { setStatus(res.error.message); return; }
    await load();
    setStatus("Provisioned ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Owner Onboarding Queue</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        One-click approve → provision membership (+ optional welcome mail). {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.75 }}>State</label>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
        <button onClick={load}>Reload</button>
        <div style={{ opacity: 0.75 }}>Pending: {pending.length} • Total: {rows.length}</div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Welcome Mail</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
            Send welcome mail (direct)
          </label>
          <input value={subjectTpl} onChange={(e) => setSubjectTpl(e.target.value)} />
          <textarea value={bodyTpl} onChange={(e) => setBodyTpl(e.target.value)} rows={6} />
          <div style={{ opacity: 0.65, fontSize: 12 }}>
            Placeholders: <code>{"{{player_name}}"}</code> <code>{"{{game_name}}"}</code> <code>{"{{alliance_code}}"}</code> <code>{"{{state_code}}"}</code>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {pending.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {r.state_code} • {r.alliance_code} • {r.player_name || r.game_name || "Player"}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()} • requester {(r.requester_user_id ? r.requester_user_id.slice(0, 8) : "unknown")}…
                  {r.discord_name ? ` • discord ${r.discord_name}` : ""}
                </div>
                {r.note ? <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{r.note}</div> : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => approveAndProvision(r)}>Approve + Provision</button>
                <button onClick={() => reject(r)}>Reject</button>
              </div>
            </div>

            <div style={{ padding: 12, opacity: 0.75, fontSize: 12 }}>
              If provisioning succeeds, the player will get membership in <code>player_alliances</code> and can use <code>/me</code>. Welcome mail appears in <code>/mail-v2</code>.
            </div>
          </div>
        ))}

        {pending.length === 0 ? <div style={{ opacity: 0.75 }}>No pending requests.</div> : null}
      </div>
    </div>
  );
}


