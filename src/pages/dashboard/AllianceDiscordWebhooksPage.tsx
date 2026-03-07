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

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function maskUrl(u: string) {
  const x = s(u);
  if (!x) return "";
  if (x.length <= 16) return "••••••••••••••••";
  return x.slice(0, 10) + "••••••••••" + x.slice(-8);
}

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

  async function load() {
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

  useEffect(() => { load(); }, [allianceCode]);

  async function add() {
    try {
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
      await load();
      setStatus("Saved ✅");
      window.setTimeout(() => setStatus(""), 900);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Save failed"));
    }
  }

  async function toggleActive(r: Row) {
    try {
      setStatus("");
      const up = await supabase
        .from("alliance_discord_webhooks")
        .update({ active: !(r.active === true) } as any)
        .eq("id", r.id);
      if (up.error) { setStatus(up.error.message); return; }
      await load();
    } catch (e: any) {
      setStatus(String(e?.message || e || "Update failed"));
    }
  }

  async function remove(r: Row) {
    try {
      if (!confirm("Delete this webhook?")) return;
      setStatus("");
      const del = await supabase.from("alliance_discord_webhooks").delete().eq("id", r.id);
      if (del.error) { setStatus(del.error.message); return; }
      await load();
    } catch (e: any) {
      setStatus(String(e?.message || e || "Delete failed"));
    }
  }

  function copy(text: string) {
    try { navigator.clipboard.writeText(text); setStatus("Copied ✅"); window.setTimeout(()=>setStatus(""), 900); } catch {}
  }

  const base = allianceCode ? `/dashboard/${encodeURIComponent(allianceCode)}` : "/dashboard";

  return (
    <CommandCenterShell
      title={`Discord Webhooks — ${allianceCode || "?"}`}
      subtitle="Alliance webhook registry • RLS enforced • keep URLs restricted"
      modules={modules}
      activeModuleKey="alliance"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav(base)}>Back</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Dossier</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
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
          <div style={{ fontWeight: 950 }}>Add Webhook</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
            Keep webhook URLs private. Only alliance leadership/app admins should have access.
          </div>

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
              return (
                <div key={r.id} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap: 10, alignItems:"center", flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {s(r.label) || "Webhook"} {r.active === false ? <span style={{ opacity: 0.7 }}>• disabled</span> : null}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                        {show}
                      </div>
                    </div>

                    <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
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
