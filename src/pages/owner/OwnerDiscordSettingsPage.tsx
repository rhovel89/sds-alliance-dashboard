import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = { id: string; code: string | null; name: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

async function pickSettingsTable() {
  // Try the most likely table names first (your schema has varied naming in past)
  const candidates = ["alliances_discord_settings", "alliance_discord_settings"];
  for (const t of candidates) {
    const probe = await supabase.from(t).select("*").limit(1);
    if (!probe.error) return t;
    // If it's not a "relation does not exist" error, still treat as real table (RLS, etc.)
    if (probe.error && String(probe.error.code ?? "") -ne "42P01") return t;
  }
  return "alliances_discord_settings";
}

export default function OwnerDiscordSettingsPage() {
  const [sp, setSp] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [selectedAllianceId, setSelectedAllianceId] = useState<string>("");
  const [selectedAllianceCode, setSelectedAllianceCode] = useState<string>("");

  const [settingsTable, setSettingsTable] = useState<string>("alliances_discord_settings");
  const [settingsRow, setSettingsRow] = useState<Record<string, any> | null>(null);

  const webhookUrl = useMemo(() => String(settingsRow?.webhook_url ?? ""), [settingsRow]);

  const pickAlliance = (id: string) => {
    setSelectedAllianceId(id);
    const a = alliances.find(x => String(x.id) === String(id));
    const code = upper(a?.code);
    setSelectedAllianceCode(code);

    const next = new URLSearchParams(sp);
    next.set("allianceId", id);
    setSp(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      setHint(null);

      try {
        const tbl = await pickSettingsTable();
        if (!cancelled) setSettingsTable(tbl);

        const aRes = await supabase
          .from("alliances")
          .select("id,code,name")
          .order("code", { ascending: true });

        if (aRes.error) throw aRes.error;

        const rows = (aRes.data ?? []) as any as AllianceRow[];
        if (cancelled) return;

        setAlliances(rows);

        const fromQuery = sp.get("allianceId") ?? "";
        const first = fromQuery || (rows[0]?.id ?? "");
        if (first) pickAlliance(first);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setErr(null);
      setHint(null);
      setSettingsRow(null);

      if (!selectedAllianceId) return;

      try {
        // Prefer alliance_id = uuid reference
        const s1 = await supabase.from(settingsTable).select("*").eq("alliance_id", selectedAllianceId).maybeSingle();
        if (!s1.error) {
          if (!cancelled) setSettingsRow(s1.data ?? { alliance_id: selectedAllianceId, webhook_url: "" });
          return;
        }

        // If column isn't alliance_id or schema differs, try alliance_code
        const s2 = await supabase.from(settingsTable).select("*").eq("alliance_code", selectedAllianceCode).maybeSingle();
        if (!s2.error) {
          if (!cancelled) setSettingsRow(s2.data ?? { alliance_code: selectedAllianceCode, webhook_url: "" });
          return;
        }

        // If both failed, surface first error
        throw s1.error;
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      }
    }

    loadSettings();
    return () => { cancelled = true; };
  }, [selectedAllianceId, selectedAllianceCode, settingsTable]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setHint(null);

    try {
      if (!selectedAllianceId) throw new Error("Pick an alliance first.");

      const payload: any = {
        ...(settingsRow ?? {}),
        webhook_url: String(settingsRow?.webhook_url ?? ""),
        updated_at: new Date().toISOString(),
      };

      // Ensure we include a key
      if (payload.alliance_id == null && selectedAllianceId) payload.alliance_id = selectedAllianceId;
      if (payload.alliance_code == null && selectedAllianceCode) payload.alliance_code = selectedAllianceCode;

      // Upsert where possible; fall back to update if needed
      const up = await supabase.from(settingsTable).upsert(payload as any).select("*").maybeSingle();
      if (up.error) throw up.error;

      setSettingsRow(up.data ?? payload);
      setHint("Saved ✅");
      setTimeout(() => setHint(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🔧 Discord Settings</h2>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Route: /owner/discord • Table: {settingsTable}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.9 }}>Owner</Link>
          <Link to="/me" style={{ opacity: 0.9 }}>ME</Link>
          <Link to="/dashboard" style={{ opacity: 0.9 }}>My Dashboards</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 14 }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Alliance</div>

            <div style={{ marginTop: 10 }}>
              <select
                value={selectedAllianceId}
                onChange={(e) => pickAlliance(e.target.value)}
                style={{ padding: 10, borderRadius: 10, width: "100%" }}
              >
                {alliances.map((a) => (
                  <option key={a.id} value={a.id}>
                    {upper(a.code)} — {a.name ?? "Unnamed"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
              Selected: {upper(selectedAllianceCode)}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Webhook</div>

            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Webhook URL</span>
              <input
                value={webhookUrl}
                onChange={(e) => setSettingsRow((r) => ({ ...(r ?? {}), webhook_url: e.target.value }))}
                placeholder="https://discord.com/api/webhooks/..."
                style={{ padding: 10, borderRadius: 10 }}
              />
            </label>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={save} disabled={saving} style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 900 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              {hint ? <span style={{ opacity: 0.9 }}>{hint}</span> : null}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              If reminders aren’t sending, the #1 cause is an empty/invalid webhook URL or a bot/webhook that lost permissions.
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Raw Settings (debug)</div>
            <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.85 }}>
              {JSON.stringify(settingsRow, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
