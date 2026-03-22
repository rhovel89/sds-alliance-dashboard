import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import PlayerProfileAndHqsPanel from "../../components/player/PlayerProfileAndHqsPanel";
import AllianceDiscordChannelsManagerPanel from "../../components/alliance/AllianceDiscordChannelsManagerPanel";

type Announcement = {
  id: string;
  alliance_code: string;
  title: string;
  body?: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
};

type DiscordWebhookRow = {
  id: string;
  label: string | null;
  active: boolean | null;
};

type MentionOption = {
  key: string;
  label: string;
  source: string;
};

function getAllianceCodeFromParams(params: Record<string, string | undefined>) {
  return (params.code || params.allianceCode || params.tag || (Object.values(params)[0] ?? "") || "").toString();
}

function upper(v: string) {
  return String(v || "").toUpperCase().trim();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeKey(v: any) {
  return String(v || "").trim();
}

async function isAppAdmin(userId: string) {
  try {
    const { data, error } = await supabase.rpc("is_app_admin" as any, { uid: userId } as any);
    if (!error) return !!data;
  } catch {}
  try {
    const { data } = await supabase.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
    return !!data;
  } catch {}
  return false;
}

async function getPlayerId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.from("players").select("id").eq("auth_user_id", userId).maybeSingle();
    if (data?.id) return data.id as string;
  } catch {}
  try {
    const { data } = await supabase.from("player_auth_links").select("player_id").eq("user_id", userId).maybeSingle();
    if (data?.player_id) return data.player_id as string;
  } catch {}
  return null;
}

async function getAllianceRole(userId: string, allianceCode: string): Promise<string | null> {
  const pid = await getPlayerId(userId);
  if (!pid) return null;
  try {
    const { data } = await supabase
      .from("player_alliances")
      .select("role")
      .eq("player_id", pid)
      .eq("alliance_code", upper(allianceCode))
      .maybeSingle();
    return (data?.role ?? null) as any;
  } catch {
    return null;
  }
}

function buildRoleMentionTokens(keys: string[]) {
  return uniq(
    (keys || [])
      .map((k) => normalizeKey(k))
      .filter(Boolean)
  ).map((k) => `{{role:${k}}}`);
}

export default function AllianceAnnouncementsPage() {
  const params = useParams();
  const allianceCode = useMemo(() => upper(getAllianceCodeFromParams(params as any)), [params]);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const [discordWebhookId, setDiscordWebhookId] = useState<string>("");
  const [discordWebhookRows, setDiscordWebhookRows] = useState<DiscordWebhookRow[]>([]);

  const [mentionOptions, setMentionOptions] = useState<MentionOption[]>([]);
  const [selectedMentionKeys, setSelectedMentionKeys] = useState<string[]>([]);

  const mentionPreview = useMemo(
    () => buildRoleMentionTokens(selectedMentionKeys).join(" "),
    [selectedMentionKeys]
  );

  
  const resolveDiscordRoleMentions = (input: string) => {
    try {
      const raw = window.localStorage.getItem("sad_discord_role_map_v1");
      const parsed = raw ? JSON.parse(raw) : null;

      const globalMap =
        parsed && parsed.global && typeof parsed.global === "object"
          ? parsed.global
          : {};

      const allianceMap =
        parsed &&
        parsed.alliances &&
        parsed.alliances[allianceCode] &&
        typeof parsed.alliances[allianceCode] === "object"
          ? parsed.alliances[allianceCode]
          : {};

      const lut = new Map<string, string>();

      const addEntries = (obj: Record<string, any>) => {
        Object.entries(obj || {}).forEach(([k, v]) => {
          const key = String(k || "").trim().toLowerCase();
          const id = String(v || "").trim();
          if (key && id) lut.set(key, id);
        });
      };

      addEntries(globalMap);
      addEntries(allianceMap);

      let out = String(input || "");

      out = out.replace(/\{\{\s*role\s*:\s*([^}]+?)\s*\}\}/gi, (full, roleKey) => {
        const id = lut.get(String(roleKey || "").trim().toLowerCase());
        return id ? `<@&${id}>` : full;
      });

      out = out.replace(/\{\{\s*([^}:][^}]*)\s*\}\}/g, (full, roleKey) => {
        const id = lut.get(String(roleKey || "").trim().toLowerCase());
        return id ? `<@&${id}>` : full;
      });

      return out;
    } catch (e) {
      console.error("resolveDiscordRoleMentions failed", e);
      return String(input || "");
    }
  };
const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alliance_announcements")
        .select("id, alliance_code, title, body, pinned, created_at")
        .eq("alliance_code", allianceCode)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data as any) ?? []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPerms = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) {
        setCanManage(false);
        return;
      }
      const admin = await isAppAdmin(uid);
      if (admin) {
        setCanManage(true);
        return;
      }
      const role = (await getAllianceRole(uid, allianceCode))?.toLowerCase() ?? "";
      setCanManage(role === "owner" || role === "r5" || role === "r4");
    } catch {
      setCanManage(false);
    }
  };

  const loadDiscordWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from("alliance_discord_webhooks")
        .select("id, label, active")
        .eq("alliance_code", allianceCode)
        .neq("active", false)
        .order("label", { ascending: true });

      if (error) throw error;
      setDiscordWebhookRows((data as any) ?? []);
    } catch (e) {
      console.error(e);
      setDiscordWebhookRows([]);
    }
  };

  const loadMentionOptions = async () => {
    try {
      const raw = window.localStorage.getItem("sad_discord_role_map_v1");
      const parsed = raw ? JSON.parse(raw) : null;

      const store =
        parsed && typeof parsed === "object"
          ? parsed
          : { version: 1, global: {}, alliances: {} };

      const globalMap =
        store && typeof store.global === "object" && store.global
          ? store.global
          : {};

      const alliancesMap =
        store && typeof store.alliances === "object" && store.alliances
          ? store.alliances
          : {};

      const scopedMap =
        alliancesMap && typeof alliancesMap[allianceCode] === "object" && alliancesMap[allianceCode]
          ? alliancesMap[allianceCode]
          : {};

      const keys = Array.from(
        new Set([
          ...Object.keys(globalMap),
          ...Object.keys(scopedMap),
        ])
      )
        .map((k) => String(k || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setMentionOptions(
        keys.map((key) => ({
          key,
          label: key,
          source: Object.prototype.hasOwnProperty.call(scopedMap, key) ? "alliance" : "global",
        }))
      );
    } catch (e) {
      console.error("Failed to load Discord role mentions", e);
      setMentionOptions([]);
    }
  };

  useEffect(() => {
    const onLocalStore = () => { void loadMentionOptions(); };
    window.addEventListener("storage", onLocalStore);
    window.addEventListener("sad:localstorage", onLocalStore as EventListener);

    return () => {
      window.removeEventListener("storage", onLocalStore);
      window.removeEventListener("sad:localstorage", onLocalStore as EventListener);
    };
  }, [allianceCode]);

  useEffect(() => {
    if (!allianceCode) return;

    void load();
    void loadPerms();
    void loadDiscordWebhooks();
    void loadMentionOptions();

    const ch = supabase
      .channel("ann_page_" + allianceCode)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alliance_announcements", filter: "alliance_code=eq." + allianceCode },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  function toggleMentionKey(key: string) {
    const k = normalizeKey(key);
    if (!k) return;
    setSelectedMentionKeys((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  }

  function buildDiscordMessage(titleText: string, bodyText: string) {
    const roleLines = buildRoleMentionTokens(selectedMentionKeys);
    const t = String(titleText || "").trim();
    const b = String(bodyText || "").trim();
    const link = `${window.location.origin}/dashboard/${encodeURIComponent(upper(allianceCode))}/announcements`;

    return [
      roleLines.length ? roleLines.join(" ") : null,
      `📣 **${upper(allianceCode)} Announcement**`,
      t ? `**${t.slice(0, 180)}**` : null,
      b ? b.slice(0, 1500) : null,
      `View: ${link}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function queueAnnouncementToDiscord(titleText: string, bodyText: string) {
    const msg = buildDiscordMessage(titleText, bodyText);

    const { error } = await supabase.rpc("queue_discord_send", {
      p_kind: "discord_webhook",
      p_target: `alliance:${upper(allianceCode)}`,
      p_channel_id: String(discordWebhookId || "").trim() || "default:announcements",
      p_content: msg,
      p_meta: {
        alliance_code: upper(allianceCode),
        kind: "announcements",
        mention_roles: selectedMentionKeys,
        route: `/dashboard/${encodeURIComponent(upper(allianceCode))}/announcements`,
      },
    } as any);

    if (error) throw error;
  }

  async function createOnly() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("alliance_announcements").insert({
        alliance_code: upper(allianceCode),
        title: title.trim(),
        body: body.trim() || null,
        pinned,
      } as any);

      if (error) throw error;

      setTitle("");
      setBody("");
      setPinned(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Create failed (permissions or DB).");
    } finally {
      setSaving(false);
    }
  }

  async function createAndSend() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const t = title.trim();
      const b = body.trim();

      const { error } = await supabase.from("alliance_announcements").insert({
        alliance_code: upper(allianceCode),
        title: t,
        body: b || null,
        pinned,
      } as any);

      if (error) throw error;

      await queueAnnouncementToDiscord(t, b);

      setTitle("");
      setBody("");
      setPinned(false);
      await load();
      alert("Posted + queued to Discord ✅");
    } catch (e: any) {
      console.error(e);
      alert("Post+Send failed: " + String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function queueSendExistingAnnouncement(a: Announcement) {
    try {
      await queueAnnouncementToDiscord(String(a?.title || ""), String(a?.body || ""));
      alert("Queued to Discord ✅");
    } catch (e: any) {
      alert("Discord queue failed: " + String(e?.message || e));
    }
  }

  const del = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const { error } = await supabase.from("alliance_announcements").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      console.error(e);
      alert("Delete failed (permissions or DB).");
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📣 Announcements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a href={`/dashboard/${encodeURIComponent(allianceCode)}/discord-webhooks`} style={{ textDecoration: "none" }}>
            Discord destinations
          </a>
          <a href="/owner/discord-defaults" style={{ textDecoration: "none" }}>
            Discord defaults
          </a>
          <a href={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ textDecoration: "none" }}>
            ← Back
          </a>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>⚙️ Discord role/channel mappings</summary>
          <div style={{ marginTop: 10 }}>
            <AllianceDiscordChannelsManagerPanel allianceCode={allianceCode} />
          </div>
        </details>
      </div>

      {canManage ? (
        <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>New announcement</div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ width: "100%", padding: 10, borderRadius: 10, marginBottom: 8 }}
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body (optional)"
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 10, marginBottom: 8 }}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              alignItems: "start",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Discord destination</div>
              <select
                value={discordWebhookId}
                onChange={(e) => setDiscordWebhookId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10 }}
              >
                <option value="">Default announcements destination</option>
                {discordWebhookRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {String(r.label || r.id).slice(0, 80)}
                  </option>
                ))}
              </select>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                Pick a saved Discord webhook destination, or leave it on default.
              </div>
              <div style={{ marginTop: 6 }}>
                <a href={`/dashboard/${encodeURIComponent(allianceCode)}/discord-webhooks`} style={{ fontSize: 12, textDecoration: "none" }}>
                  Add/edit destinations
                </a>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Mention roles</div>

              {mentionOptions.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 8,
                    maxHeight: 210,
                    overflow: "auto",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  {mentionOptions.map((opt) => (
                    <label key={opt.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedMentionKeys.includes(opt.key)}
                        onChange={() => toggleMentionKey(opt.key)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  No mention options loaded yet from Discord defaults.
                </div>
              )}

              {mentionPreview ? (
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 8, wordBreak: "break-word" }}>
                  Will prepend: {mentionPreview}
                </div>
              ) : null}

              <div style={{ marginTop: 6 }}>
                <a href="/owner/discord-defaults" style={{ fontSize: 12, textDecoration: "none" }}>
                  Manage mention defaults
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              disabled={saving || !title.trim()}
              onClick={createOnly}
              style={{ padding: "10px 12px", borderRadius: 10 }}
            >
              {saving ? "Posting…" : "Post Only"}
            </button>

            <button
              disabled={saving || !title.trim()}
              onClick={createAndSend}
              style={{ padding: "10px 12px", borderRadius: 10 }}
            >
              {saving ? "Posting+Sending…" : "Post + Send to Discord"}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ padding: 10 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 10, opacity: 0.85 }}>No announcements yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((a) => (
              <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {a.pinned ? "📌 " : ""}
                      {a.title}
                    </div>
                    {a.created_at ? (
                      <div style={{ opacity: 0.6, marginTop: 4, fontSize: 12 }}>
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => queueSendExistingAnnouncement(a)}
                        style={{ padding: "8px 10px", borderRadius: 10 }}
                      >
                        Send to Discord
                      </button>
                      <button
                        type="button"
                        onClick={() => del(a.id)}
                        style={{ padding: "8px 10px", borderRadius: 10 }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {a.body ? <div style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.9 }}>{a.body}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <PlayerProfileAndHqsPanel />
    </div>
  );
}




