import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type MissingWebhook = { alliance_code: string; alliance_name: string; missing_kind: string };
type MissingPreset = { alliance_code: string; alliance_name: string; missing_preset: string };

type KindRow = { kind: string; label: string; required: boolean; active: boolean; sort_order: number };
type AllianceRow = { code: string; name: string };
type PresetRow = { id: string; alliance_code: string; preset_key: string; label: string; mention_text: string; active: boolean };

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function upper(x: any) { return s(x).trim().toUpperCase(); }

export default function OwnerDiscordWebhookRequirementsPage() {
  const [status, setStatus] = useState<string>("");
  const [missingWebhooks, setMissingWebhooks] = useState<MissingWebhook[]>([]);
  const [missingPresets, setMissingPresets] = useState<MissingPreset[]>([]);
  const [kinds, setKinds] = useState<KindRow[]>([]);
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");
  const [presets, setPresets] = useState<PresetRow[]>([]);

  // Add Kind form
  const [newKind, setNewKind] = useState<string>("updates");
  const [newKindLabel, setNewKindLabel] = useState<string>("Updates");
  const [newKindRequired, setNewKindRequired] = useState<boolean>(false);

  // Add Preset form
  const [newPresetKey, setNewPresetKey] = useState<string>("custom_1");
  const [newPresetLabel, setNewPresetLabel] = useState<string>("Custom");
  const [newPresetText, setNewPresetText] = useState<string>("@Custom");

  async function loadAll() {
    setStatus("Loading…");
    const a = await supabase.from("alliances").select("code,name").order("name", { ascending: true });
    if (a.error) { setStatus(a.error.message); return; }
    setAlliances(((a.data || []) as any[]).map((x) => ({ code: upper(x.code), name: s(x.name) })));

    const k = await supabase.from("discord_webhook_kinds").select("*").order("sort_order", { ascending: true });
    if (!k.error) setKinds((k.data || []) as any);

    const mw = await supabase.from("v_alliance_missing_webhook_defaults").select("*").order("alliance_code", { ascending: true });
    if (!mw.error) setMissingWebhooks((mw.data || []) as any);

    const mp = await supabase.from("v_alliance_missing_mention_presets").select("*").order("alliance_code", { ascending: true });
    if (!mp.error) setMissingPresets((mp.data || []) as any);

    setStatus("");
  }

  async function loadPresetsForAlliance(code: string) {
    setPresets([]);
    if (!code) return;
    const r = await supabase
      .from("alliance_mention_presets")
      .select("*")
      .eq("alliance_code", upper(code))
      .order("label", { ascending: true });
    if (r.error) { setStatus(r.error.message); return; }
    setPresets((r.data || []) as any);
  }

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    void loadPresetsForAlliance(selectedAlliance);
  }, [selectedAlliance]);

  const missingWebhooksByAlliance = useMemo(() => {
    const m = new Map<string, MissingWebhook[]>();
    for (const row of missingWebhooks) {
      const key = upper(row.alliance_code);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(row);
    }
    return m;
  }, [missingWebhooks]);

  const missingPresetsByAlliance = useMemo(() => {
    const m = new Map<string, MissingPreset[]>();
    for (const row of missingPresets) {
      const key = upper(row.alliance_code);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(row);
    }
    return m;
  }, [missingPresets]);

  async function addOrUpdateKind() {
    setStatus("");
    const kind = s(newKind).trim().toLowerCase();
    const label = s(newKindLabel).trim();
    if (!kind || !label) { setStatus("Kind + label required."); return; }

    const payload: any = { kind, label, required: newKindRequired, active: true, sort_order: 100 };
    const up = await supabase.from("discord_webhook_kinds").upsert(payload as any);
    if (up.error) { setStatus(up.error.message); return; }
    await loadAll();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function toggleKind(k: KindRow, field: "required" | "active") {
    setStatus("");
    const patch: any = {};
    patch[field] = !(k as any)[field];
    const up = await supabase.from("discord_webhook_kinds").update(patch).eq("kind", k.kind);
    if (up.error) { setStatus(up.error.message); return; }
    await loadAll();
  }

  async function addPreset() {
    setStatus("");
    const ac = upper(selectedAlliance);
    if (!ac) { setStatus("Select an alliance first."); return; }
    const payload: any = {
      alliance_code: ac,
      preset_key: s(newPresetKey).trim().toLowerCase(),
      label: s(newPresetLabel).trim(),
      mention_text: s(newPresetText).trim(),
      active: true,
    };
    if (!payload.preset_key || !payload.label || !payload.mention_text) { setStatus("Preset key/label/text required."); return; }
    const up = await supabase.from("alliance_mention_presets").upsert(payload as any, { onConflict: "alliance_code,preset_key" } as any);
    if (up.error) { setStatus(up.error.message); return; }
    await loadPresetsForAlliance(ac);
    await loadAll();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function updatePreset(p: PresetRow, patch: Partial<PresetRow>) {
    setStatus("");
    const up = await supabase.from("alliance_mention_presets").update(patch as any).eq("id", p.id);
    if (up.error) { setStatus(up.error.message); return; }
    await loadPresetsForAlliance(selectedAlliance);
    await loadAll();
  }

  const box: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 14,
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>🧷 Discord Webhook Requirements</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Required webhook defaults per alliance: <b>announcements</b>, <b>alerts</b>, <b>threads</b>.
            Mention presets: <b>Wasteland King</b>, <b>Leadership</b>, <b>Peeps</b>.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()}>Refresh</button>
          <Link className="zombie-btn" to="/owner/discord-defaults" style={{ textDecoration: "none" }}>State Defaults</Link>
        </div>
      </div>

      {status ? <div style={{ marginTop: 10, opacity: 0.9 }}>{status}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={box}>
          <div style={{ fontWeight: 900 }}>🧨 Missing Required Webhook Defaults</div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
            Fix by setting defaults in each alliance’s Webhooks page.
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {alliances.map((a) => {
              const miss = (missingWebhooksByAlliance.get(upper(a.code)) || []).map((x) => x.missing_kind);
              const ok = miss.length === 0;
              return (
                <div key={a.code} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{a.name} <span style={{ opacity: 0.8 }}>({a.code})</span></div>
                      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                        {ok ? "✅ All required defaults set" : ("❌ Missing: " + miss.join(", "))}
                      </div>
                    </div>
                    <Link className="zombie-btn" to={`/dashboard/${encodeURIComponent(a.code)}/discord-webhooks`} style={{ textDecoration: "none" }}>
                      Configure →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={box}>
          <div style={{ fontWeight: 900 }}>📛 Mention Presets</div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
            These are editable strings (ex: <code>@Leadership</code> or <code>{"<@&ROLE_ID>"}</code>).
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ opacity: 0.85 }}>Alliance:</div>
            <select value={selectedAlliance} onChange={(e) => setSelectedAlliance(upper(e.target.value))} style={{ padding: "8px 10px", borderRadius: 10 }}>
              <option value="">(Select)</option>
              {alliances.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
          </div>

          {selectedAlliance ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Missing presets: {(missingPresetsByAlliance.get(selectedAlliance) || []).map((x) => x.missing_preset).join(", ") || "none"}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {presets.map((p) => (
                  <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{p.label} <span style={{ opacity: 0.75 }}>({p.preset_key})</span></div>
                        <input
                          value={p.mention_text || ""}
                          onChange={(e) => updatePreset(p, { mention_text: e.target.value })}
                          style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 10 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button className="zombie-btn" type="button" onClick={() => updatePreset(p, { active: !p.active })}>
                          {p.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ fontWeight: 900 }}>➕ Add preset</div>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
                  <input value={newPresetKey} onChange={(e) => setNewPresetKey(e.target.value)} placeholder="preset_key (custom_1)" style={{ padding: "8px 10px", borderRadius: 10 }} />
                  <input value={newPresetLabel} onChange={(e) => setNewPresetLabel(e.target.value)} placeholder="Label" style={{ padding: "8px 10px", borderRadius: 10 }} />
                  <input value={newPresetText} onChange={(e) => setNewPresetText(e.target.value)} placeholder="@Role or <@&ROLE_ID>" style={{ padding: "8px 10px", borderRadius: 10 }} />
                  <button className="zombie-btn" type="button" onClick={() => void addPreset()}>Add</button>
                </div>
              </div>
            </div>
          ) : <div style={{ marginTop: 10, opacity: 0.75 }}>Select an alliance to manage presets.</div>}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={box}>
          <div style={{ fontWeight: 900 }}>🧬 Webhook Kinds Registry (Owner/Admin)</div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
            Add new kinds here later (no recode). “Required” kinds show up in the missing-defaults report.
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8 }}>
            <input value={newKind} onChange={(e) => setNewKind(e.target.value)} placeholder="kind (lowercase)" style={{ padding: "8px 10px", borderRadius: 10 }} />
            <input value={newKindLabel} onChange={(e) => setNewKindLabel(e.target.value)} placeholder="Label" style={{ padding: "8px 10px", borderRadius: 10 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
              <input type="checkbox" checked={newKindRequired} onChange={(e) => setNewKindRequired(e.target.checked)} />
              Required
            </label>
            <button className="zombie-btn" type="button" onClick={() => void addOrUpdateKind()}>Save</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {kinds.map((k) => (
              <div key={k.kind} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{k.label} <span style={{ opacity: 0.75 }}>({k.kind})</span></div>
                    <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                      {k.required ? "Required" : "Optional"} • {k.active ? "Active" : "Disabled"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" type="button" onClick={() => void toggleKind(k, "required")}>
                      {k.required ? "Unrequire" : "Require"}
                    </button>
                    <button className="zombie-btn" type="button" onClick={() => void toggleKind(k, "active")}>
                      {k.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
        Tip: Defaults are resolved by the worker when you send to <code>default:announcements</code>, <code>default:alerts</code>, <code>default:threads</code>.
      </div>
    </div>
  );
}
