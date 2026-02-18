import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  id: string;
  code?: string | null;
  name?: string | null;
};

type DiscordSettingsRow = {
  id?: string;
  alliance_id?: string | null;
  webhook_url?: string | null;
  [key: string]: any;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function OwnerDiscordSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [settings, setSettings] = useState<DiscordSettingsRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const settingsByAlliance = useMemo(() => {
    const m: Record<string, DiscordSettingsRow> = {};
    for (const s of settings) {
      const aid = String(s.alliance_id ?? "");
      if (aid) m[aid] = s;
    }
    return m;
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      setHint(null);

      try {
        const u = await supabase.auth.getUser();
        if (!u.data?.user?.id) {
          setErr("Please sign in.");
          setLoading(false);
          return;
        }

        // Alliances
        const aRes = await supabase
          .from("alliances")
          .select("id,code,name")
          .order("code", { ascending: true });

        if (aRes.error) throw aRes.error;
        if (!cancelled) setAlliances((aRes.data ?? []) as any);

        // Settings (best-effort: table must exist)
        const sRes = await supabase
          .from("alliance_discord_settings")
          .select("*");

        if (sRes.error) throw sRes.error;
        if (!cancelled) setSettings((sRes.data ?? []) as any);

        // Prime drafts from existing settings
        const nextDraft: Record<string, string> = {};
        for (const row of (sRes.data ?? []) as any[]) {
          const aid = String(row.alliance_id ?? "");
          if (aid) nextDraft[aid] = String(row.webhook_url ?? "");
        }
        if (!cancelled) setDraft(nextDraft);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const save = async (allianceId: string) => {
    setErr(null);
    setHint(null);

    const url = String(draft[allianceId] ?? "").trim();
    if (!url) {
      setErr("Webhook URL cannot be empty.");
      return;
    }

    try {
      const existing = settingsByAlliance[allianceId];
      const payload: any = {
        alliance_id: allianceId,
        webhook_url: url,
        updated_at: new Date().toISOString(),
      };
      if (existing?.id) payload.id = existing.id;

      // Most schemas have unique(alliance_id). If not, this still updates by id when present.
      const up = await supabase
        .from("alliance_discord_settings")
        .upsert(payload, { onConflict: "alliance_id" as any })
        .select("*");

      if (up.error) throw up.error;

      // Refresh local settings list
      const sRes = await supabase.from("alliance_discord_settings").select("*");
      if (sRes.error) throw sRes.error;
      setSettings((sRes.data ?? []) as any);

      setHint("Saved ✅");
      setTimeout(() => setHint(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🔧 Discord Settings</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Configure per-alliance Discord webhook URLs for reminders/notifications.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link>
          <Link to="/owner/discord" style={{ opacity: 0.85 }}>ME</Link>
        </div>
      </div>

      {hint ? (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid rgba(0,255,0,0.25)", borderRadius: 10 }}>
          {hint}
        </div>
      ) : null}

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {alliances.map((a) => {
          const id = String(a.id);
          const code = upper(a.code);
          const name = a.name ?? "";
          const value = draft[id] ?? "";

          return (
            <div key={id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>
                  {code || "(no code)"} {name ? — deletePost : ""}
                </div>
                <button onClick={() => save(id)} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}>
                  Save
                </button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Webhook URL</div>
                <input
                  value={value}
                  onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ padding: 10, borderRadius: 10 }}
                />
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Tip: Make sure the webhook channel matches the alliance.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

