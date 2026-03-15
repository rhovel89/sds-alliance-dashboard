import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  alliance_code: string;
  label: string | null;
  webhook_url: string;
  active: boolean | null;
  created_at: string | null;
};

type DefaultRow = { alliance_code: string; kind: string; webhook_id: string | null };

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function maskUrl(u: string) {
  const x = s(u);
  if (!x) return "";
  if (x.length <= 18) return "••••••••••••••••••";
  return x.slice(0, 10) + "••••••••••" + x.slice(-8);
}

const KINDS = [
  { key: "announcements", label: "Announcements" },
  { key: "alerts", label: "Alerts" },
  { key: "ops", label: "Ops Feed" },
  { key: "threads", label: "Threads" },
  { key: "achievements", label: "Achievements" },
  { key: "hq_map", label: "HQ Map" },
] as const;

export default function AllianceDiscordWebhooksPage() {
  const nav = useNavigate();
  const params = useParams();
  const allianceCode = s((params as any)?.alliance_id || "").trim();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const [defaults, setDefaults] = useState<Record<string, string | "">>({
    announcements: "",
    alerts: "",
    ops: "",
    threads: "",
    achievements: "",
    hq_map: "",
  });

  const activeWebhooks = useMemo(() => rows.filter(r => r.active !== false), [rows]);

  const defaultBadges = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const k of Object.keys(defaults)) {
      const wid = defaults[k];
      if (!wid) continue;
      if (!map.has(wid)) map.set(wid, []);
      map.get(wid)!.push(k);
    }
    return map;
  }, [defaults]);

  async function loadDefaults() {
    if (!allianceCode) return;
    const r = await supabase
      .from("alliance_discord_webhook_defaults")
      .select("alliance_code,kind,webhook_id")
      .eq("alliance_code", allianceCode);

    if (r.error) { setStatus(r.error.message); return; }
    const next: any = { announcements:"", alerts:"", ops:"", threads:"", achievements:"" };
    (r.data || []).forEach((d: any) => { next[String(d.kind || "")] = d.webhook_id ? String(d.webhook_id) : ""; });
    setDefaults(next);
  }

  async function loadWebhooks() {
    if (!allianceCode) return;
    setLoading(true);
    setStatus("");

    const r = await supabase
      .from("alliance_discord_webhooks")
      .select("*")
      .eq("alliance_code", allianceCode)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows((r.data || []) as any[]);
  }

  async function loadAll() {
    await loadWebhooks();
    await loadDefaults();
  }

  useEffect(() => { void loadAll(); }, [allianceCode]);

  async function add() {
    setStatus("");
    if (!allianceCode) { setStatus("Missing alliance code."); return; }
    const u = s(url).trim();
    if (!u) { setStatus("Webhook URL required."); return; }

    const me = await supabase.auth.getUser();
    const uid = me.data?.user?.id || null;

    const payload: any = {
      alliance_code: allianceCode,
      label: s(label).trim() || null,
      webhook_url: u,
      active: true,
      created_by: uid,
      created_at: new Date().toISOString(),
    };

    const ins = await supabase.from("alliance_discord_webhooks").insert(payload);
    if (ins.error) { setStatus(ins.error.message); return; }

    setLabel("");
    setUrl("");
    await loadAll();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function toggleActive(r: Row) {
    setStatus("");
    const up = await supabase
      .from("alliance_discord_webhooks")
      .update({ active: !(r.active === true) } as any)
      .eq("id", r.id);

    if (up.error) { setStatus(up.error.message); return; }
    await loadAll();
  }

  async function remove(r: Row) {
    if (!confirm("Delete this webhook?")) return;
    setStatus("");
    const del = await supabase.from("alliance_discord_webhooks").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
    await loadAll();
  }

  async function setDefault(kind: string, webhookId: string | "") {
    setStatus("");
    const me = await supabase.auth.getUser();
    const uid = me.data?.user?.id || null;

    const payload: any = {
      alliance_code: allianceCode,
      kind,
      webhook_id: webhookId ? webhookId : null,
      updated_at: new Date().toISOString(),
      updated_by: uid,
    };

    const up = await supabase
      .from("alliance_discord_webhook_defaults")
      .upsert(payload as any, { onConflict: "alliance_code,kind" } as any);

    if (up.error) { setStatus(up.error.message); return; }
    await loadDefaults();
    setStatus("Default saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function sendTest(r: Row) {
    setStatus("");
    const msg = `🪝 Webhook test — ${allianceCode} — ${new Date().toISOString()}`;
    const res = await supabase.rpc("queue_discord_send", {
      p_kind: "discord_webhook",
      p_target: `alliance:${allianceCode}`,
      p_channel_id: String(r.id), // webhook_id
      p_content: msg,
      p_meta: { alliance_code: allianceCode, webhook_id: String(r.id), label: r.label },
    } as any);

    if ((res as any)?.error) { setStatus((res as any).error.message || "Queue failed"); return; }
    setStatus("Queued ✅ (worker will deliver)");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function sendTestViaDefault(kind: string) {
    setStatus("");
    const msg = `🧟 Default webhook test (${kind}) — ${allianceCode} — ${new Date().toISOString()}`;
    const res = await supabase.rpc("queue_discord_send", {
      p_kind: "discord_webhook",
      p_target: `alliance:${allianceCode}`,
      p_channel_id: `default:${kind}`, // sentinel resolved by worker
      p_content: msg,
      p_meta: { alliance_code: allianceCode, kind },
    } as any);

    if ((res as any)?.error) { setStatus((res as any).error.message || "Queue failed"); return; }
    setStatus("Queued ✅ (worker will resolve default)");
    window.setTimeout(() => setStatus(""), 1200);
  }

  function copy(text: string) {
    try { navigator.clipboard.writeText(text); setStatus("Copied ✅"); window.setTimeout(()=>setStatus(""), 900); } catch {}
  }

  const base = allianceCode ? `/dashboard/${encodeURIComponent(allianceCode)}` : "/dashboard";

  return (
    <CommandCenterShell
      title={`Discord Webhooks — ${allianceCode || "?"}`}
      subtitle="Alliance webhook registry + defaults • RLS enforced"
      modules={modules}
      activeModuleKey="alliance"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav(base)}>Back</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")}>My Dossier</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border:"1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 12, maxWidth: 980 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Defaults (per alliance)</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
            Choose the default webhook used by future “send to Discord” actions.
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10, marginTop: 10 }}>
            {KINDS.map(k => (
              <div key={k.key} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{k.label}</div>

                <div style={{ display:"flex", gap: 8, marginTop: 8, flexWrap:"wrap", alignItems:"center" }}>
                  <select
                    value={defaults[k.key] || ""}
                    onChange={(e) => setDefaults((p) => ({ ...p, [k.key]: e.target.value }))}
                    style={{ flex: 1, minWidth: 220, padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
                  >
                    <option value="">(none)</option>
                    {activeWebhooks.map(w => (
                      <option key={w.id} value={w.id}>{String(w.label || w.id).slice(0, 80)}</option>
                    ))}
                  </select>
                  <button className="zombie-btn" type="button" onClick={() => setDefault(k.key, defaults[k.key] || "")}>Save</button>
                  <button className="zombie-btn" type="button" onClick={() => sendTestViaDefault(k.key)}>Test Default</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Add Webhook</div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr auto", gap: 10, marginTop: 10, alignItems:"center" }}>
            <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Label (optional)"
              style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }} />
            <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Discord webhook URL"
              style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }} />
            <button className="zombie-btn" type="button" onClick={add}>Add</button>
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Webhooks</div>

          <div style={{ display:"flex", flexDirection:"column", gap: 10, marginTop: 10 }}>
            {rows.map((r) => {
              const isReveal = !!reveal[r.id];
              const show = isReveal ? s(r.webhook_url) : maskUrl(s(r.webhook_url));
              const badges = defaultBadges.get(r.id) || [];
              return (
                <div key={r.id} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap: 10, alignItems:"center", flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {s(r.label) || "Webhook"} {r.active === false ? <span style={{ opacity: 0.7 }}>• disabled</span> : null}
                      </div>
                      {badges.length ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                          Defaults: {badges.join(", ")}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{show}</div>
                    </div>

                    <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
                      <button className="zombie-btn" type="button" onClick={() => sendTest(r)}>Send Test</button>
                      <button className="zombie-btn" type="button" onClick={() => setReveal((p)=>({ ...p, [r.id]: !p[r.id] }))}>
                        {isReveal ? "Hide" : "Reveal"}
                      </button>
                      <button className="zombie-btn" type="button" onClick={() => copy(s(r.webhook_url))}>Copy</button>
                      <button className="zombie-btn" type="button" onClick={() => toggleActive(r)}>
                        {r.active === false ? "Enable" : "Disable"}
                      </button>
                      <button className="zombie-btn" type="button" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!rows.length ? <div style={{ opacity: 0.75 }}>No webhooks saved yet.</div> : null}
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}



