import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type DiscordSetting = {
  alliance_id: string;
  webhook_url: string;
  role_id: string | null;
  enabled: boolean;
};

function maskWebhook(url: string) {
  if (!url) return "";
  if (url.length <= 28) return url;
  return url.slice(0, 28) + "…";
}

export default function OwnerDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<DiscordSetting[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newRow, setNewRow] = useState<DiscordSetting>({
    alliance_id: "",
    webhook_url: "",
    role_id: "",
    enabled: true,
  });

  const [editing, setEditing] = useState<Record<string, DiscordSetting>>({});
  const editingKeys = useMemo(() => new Set(Object.keys(editing)), [editing]);

  async function boot() {
    setLoading(true);
    setError(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check admin status (RLS will also enforce)
    const adminRes = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    setIsAdmin(!!adminRes.data);

    setLoading(false);
  }

  async function fetchRows() {
    setError(null);

    const res = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled")
      .order("alliance_id", { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as DiscordSetting[]);
  }

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function normalizeAllianceId(v: string) {
    return v.trim().toUpperCase();
  }

  function validate(setting: DiscordSetting) {
    const aid = normalizeAllianceId(setting.alliance_id);
    if (!aid) return "Alliance ID is required (ex: WOC).";

    if (!setting.webhook_url?.trim()) return "Webhook URL is required.";

    // Light validation (don’t over-block)
    const w = setting.webhook_url.trim();
    if (!w.startsWith("https://discord.com/api/webhooks/") && !w.startsWith("https://canary.discord.com/api/webhooks/")) {
      return "Webhook URL should start with https://discord.com/api/webhooks/ ...";
    }

    // role_id can be empty/null
    return null;
  }

  async function addOrUpdate(setting: DiscordSetting) {
    setError(null);

    const payload: DiscordSetting = {
      alliance_id: normalizeAllianceId(setting.alliance_id),
      webhook_url: setting.webhook_url.trim(),
      role_id: (setting.role_id ?? "").toString().trim() || null,
      enabled: !!setting.enabled,
    };

    const v = validate(payload);
    if (v) return alert(v);

    const res = await supabase
      .from("alliance_discord_settings")
      .upsert(payload, { onConflict: "alliance_id" });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  async function remove(alliance_id: string) {
    setError(null);
    const ok = confirm(`Delete Discord routing for ${alliance_id}?`);
    if (!ok) return;

    const res = await supabase
      .from("alliance_discord_settings")
      .delete()
      .eq("alliance_id", alliance_id);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchRows();
  }

  async function sendTest(allianceId: string) {
    setError(null);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return alert("No session token.");

    const res = await fetch("https://pvngssnazuzekriakqds.functions.supabase.co/send-test-discord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ alliance_id: allianceId }),
    });

    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      setError(txt || "Test failed.");
      return;
    }

    alert(`Test sent for ${allianceId}`);
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Owner Dashboard</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>🧟 Owner Dashboard</h2>
        <div>Access denied (not an admin).</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner Dashboard</h2>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Manage per-alliance Discord routing (webhook + optional role mention).
      </div>

      {error ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #733", borderRadius: 8 }}>
          {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Add / Update Alliance</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 800 }}>
          <input
            placeholder="Alliance ID (ex: WOC)"
            value={newRow.alliance_id}
            onChange={(e) => setNewRow({ ...newRow, alliance_id: e.target.value })}
          />

          <input
            placeholder="Discord Webhook URL"
            value={newRow.webhook_url}
            onChange={(e) => setNewRow({ ...newRow, webhook_url: e.target.value })}
          />

          <input
            placeholder="Role ID (optional)"
            value={newRow.role_id ?? ""}
            onChange={(e) => setNewRow({ ...newRow, role_id: e.target.value })}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={newRow.enabled}
              onChange={(e) => setNewRow({ ...newRow, enabled: e.target.checked })}
            />
            <span>Enabled</span>
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => addOrUpdate(newRow)}>Save</button>
            <button onClick={() => setNewRow({ alliance_id: "", webhook_url: "", role_id: "", enabled: true })}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Existing Alliances</div>

        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const key = r.alliance_id;
            const isEditing = editingKeys.has(key);
            const row = isEditing ? editing[key] : r;

            return (
              <div key={key} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{key}</div>

                  <div style={{ display: "flex", gap: 10 }}>
                    {!isEditing ? (
                      <button
                        onClick={() => setEditing({ ...editing, [key]: { ...r } })}
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            await addOrUpdate(row);
                            const copy = { ...editing };
                            delete copy[key];
                            setEditing(copy);
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            const copy = { ...editing };
                            delete copy[key];
                            setEditing(copy);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    <button onClick={() => sendTest(key)}>Send Test</button>


                    <button onClick={() => remove(key)}>Delete</button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={{ opacity: 0.85, fontSize: 12 }}>
                    Webhook: {isEditing ? "" : maskWebhook(r.webhook_url)}
                  </div>

                  <input
                    disabled={!isEditing}
                    value={row.webhook_url}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: { ...row, webhook_url: e.target.value } })
                    }
                  />

                  <input
                    disabled={!isEditing}
                    value={row.role_id ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: { ...row, role_id: e.target.value } })
                    }
                    placeholder="Role ID (optional)"
                  />

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={!!row.enabled}
                      onChange={(e) =>
                        setEditing({ ...editing, [key]: { ...row, enabled: e.target.checked } })
                      }
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No rows found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

