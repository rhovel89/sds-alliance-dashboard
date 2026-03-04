import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";

type Row = {
  id: string;
  state_code: string;
  channel_name: string;
  channel_id: string;
  active?: boolean | null;
  is_default?: boolean | null;
  created_at?: string | null;
};

function norm(s: any) { return String(s ?? "").trim(); }

export default function StateDiscordChannelsManagerPanel(props: { stateCode: string }) {
  const stateCode = useMemo(() => norm(props.stateCode), [props.stateCode]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [reportsChannelId, setReportsChannelId] = useState<string>("");
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");

  const supportsActive = useMemo(() => rows.some(r => typeof r.active === "boolean"), [rows]);
  const supportsDefault = useMemo(() => rows.some(r => typeof r.is_default === "boolean"), [rows]);

  async function load() {
    if (!stateCode) return;
    setLoading(true);
    setStatus("");

    // IMPORTANT: select("*") avoids 400s when columns differ between environments
    const res = await supabase
      .from("state_discord_channels")
      .select("*")
      .eq("state_code", stateCode)
      .order("channel_name", { ascending: true });

    setLoading(false);

    if (res.error) {
      setRows([]);
      setStatus(res.error.message);
      return;
    }

    const data = ((res.data ?? []) as any[]) as Row[];
    // Sort default first ONLY if the column exists
    if (data.some(r => typeof (r as any).is_default === "boolean")) {
      data.sort((a, b) => {
        const da = (a as any).is_default ? 1 : 0;
        const db = (b as any).is_default ? 1 : 0;
        if (db !== da) return db - da;
        return String(a.channel_name || "").localeCompare(String(b.channel_name || ""));
      });
    }

    setRows(data);

    // Load saved defaults (reports/export channels) from state_discord_defaults (schema may differ)
    try {
      const d = await supabase
        .from("state_discord_defaults")
        .select("*")
        .eq("state_code", stateCode)
        .maybeSingle();

      const obj: any = d.data || {};
      const v = String(
        obj.reports_channel_id ?? obj.achievements_export_channel_id ?? obj.alerts_channel_id ?? ""
      ).trim();
      if (v) setReportsChannelId(v);
    } catch {}
  }

  useEffect(() => { void load(); }, [stateCode]);

  async function add() {
    const n = name.trim();
    const c = channelId.trim();
    if (!n || !c) return;

    setStatus("Saving…");

    // Try insert with is_default, then retry without if column missing
    let payload: any = { state_code: stateCode, channel_name: n, channel_id: c };
    if (rows.length === 0) payload.is_default = true;

    let ins = await supabase.from("state_discord_channels").insert(payload);
    if (ins.error && String(ins.error.message || "").toLowerCase().includes("column") && String(ins.error.message || "").toLowerCase().includes("is_default")) {
      delete payload.is_default;
      ins = await supabase.from("state_discord_channels").insert(payload);
    }

    if (ins.error) { setStatus(ins.error.message); return; }
    setName(""); setChannelId("");
    await load();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function setDefault(r: Row) {
    if (!supportsDefault) { alert("Default flag not supported yet. Apply the SQL migration first."); return; }
    setStatus("Setting default…");

    const unset = await supabase
      .from("state_discord_channels")
      .update({ is_default: false } as any)
      .eq("state_code", stateCode)
      .eq("is_default", true);

    if (unset.error) { setStatus(unset.error.message); return; }

    const up = await supabase.from("state_discord_channels").update({ is_default: true } as any).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }

    await load();
    setStatus("Default set ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function toggleActive(r: Row) {
    if (!supportsActive) { alert("Active flag not supported yet. Apply the SQL migration first."); return; }
    setStatus("Updating…");
    const up = await supabase.from("state_discord_channels").update({ active: !(r.active === true) } as any).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function remove(r: Row) {
    if (!confirm("Delete this channel entry?")) return;
    setStatus("Deleting…");
    const del = await supabase.from("state_discord_channels").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
    await load();
    setStatus("");
  }

  async function saveReportsDefault() {
    if (!stateCode) return;
    const cid = String(reportsChannelId || "").trim();
    if (!cid) return;

    setStatus("Saving default…");

    // Try to satisfy NOT NULL alerts_channel_id if it exists (use same channel id)
    // Also set achievements_export_channel_id for the export panel
    const payload: any = {
      state_code: stateCode,
      reports_channel_id: cid,
      achievements_export_channel_id: cid,
      alerts_channel_id: cid,
    };

    let up = await supabase.from("state_discord_defaults").upsert(payload as any, { onConflict: "state_code" } as any);

    // If alerts_channel_id column does NOT exist, retry without it
    if (up.error && String(up.error.message || "").toLowerCase().includes("alerts_channel_id") && String(up.error.message || "").toLowerCase().includes("column")) {
      delete payload.alerts_channel_id;
      up = await supabase.from("state_discord_defaults").upsert(payload as any, { onConflict: "state_code" } as any);
    }

    if (up.error) { setStatus(up.error.message); return; }
    setStatus("Default saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>State Discord Channels</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            State {stateCode} • {loading ? "Loading…" : `${rows.length} saved`} {status ? " • " + status : ""}
          </div>
        </div>
        <button className="zombie-btn" type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Default Reports / Export Channel</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
          Used by Achievements “Export → PNG → Discord”
        </div>

        <div style={{ marginTop: 10 }}>
          <StateDiscordChannelSelect
            stateCode={stateCode}
            value={reportsChannelId}
            onChange={setReportsChannelId}
            label="Reports Channel"
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => void saveReportsDefault()} disabled={!String(reportsChannelId || "").trim()}>
            Save Default
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input className="zombie-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name (ex: State Alerts)" />
        <input className="zombie-input" value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel ID (numbers)" />
        <div><button className="zombie-btn" type="button" onClick={add} disabled={!name.trim() || !channelId.trim()}>Add Channel</button></div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {r.is_default ? "⭐ " : ""}{r.channel_name}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {r.channel_id} • {typeof r.active === "boolean" ? (r.active ? "active" : "inactive") : "configured"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {supportsDefault && !r.is_default ? <button className="zombie-btn" type="button" onClick={() => void setDefault(r)}>Set default</button> : null}
                {supportsActive ? <button className="zombie-btn" type="button" onClick={() => void toggleActive(r)}>{r.active ? "Disable" : "Enable"}</button> : null}
                <button className="zombie-btn" type="button" onClick={() => void remove(r)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.8 }}>No channels yet.</div> : null}
      </div>

      <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
        If you still see 400 errors, apply the SQL migration in <code>supabase/migrations</code> to add missing columns.
      </div>
    </div>
  );
}

