import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import PlayerProfileAndHqsPanel from "../../components/player/PlayerProfileAndHqsPanel";
import DiscordChannelSelect from "../../components/discord/DiscordChannelSelect";

type Announcement = {
  id: string;
  alliance_code: string;
  title: string;
  body?: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
};

function getAllianceCodeFromParams(params: Record<string, string | undefined>) {
return (params.code || params.allianceCode || params.tag || (Object.values(params)[0] ?? "") || "").toString();
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
      .eq("alliance_code", allianceCode.toUpperCase())
      .maybeSingle();
    return (data?.role ?? null) as any;
  } catch {
    return null;
  }
}

export default function AllianceAnnouncementsPage() {
  const params = useParams();
  const allianceCode = useMemo(() => getAllianceCodeFromParams(params as any).toUpperCase().trim(), [params]);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discordChannelId, setDiscordChannelId] = useState<string>("");
  const [autoSend, setAutoSend] = useState<boolean>(true);

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
      if (!uid) { setCanManage(false); return; }
      const admin = await isAppAdmin(uid);
      if (admin) { setCanManage(true); return; }
      const role = (await getAllianceRole(uid, allianceCode))?.toLowerCase() ?? "";
      setCanManage(role === "owner" || role === "r5" || role === "r4");
    } catch { setCanManage(false); }
  };

  useEffect(() => {
    if (!allianceCode) return;
    load();
    loadPerms();
    const ch = supabase
      .channel("ann_page_" + allianceCode)
      .on("postgres_changes", { event: "*", schema: "public", table: "alliance_announcements", filter: "alliance_code=eq." + allianceCode }, () => load())
      .subscribe();
  const createAndSend = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("alliance_announcements").insert({
        alliance_code: allianceCode,
        title: title.trim(),
        body: body.trim() || null,
        pinned,
      } as any);
      if (error) throw error;

      const t = title.trim();
      const b = body.trim();

      const msg =
        ("📣 **" + String(allianceCode || "").toUpperCase() + " Announcement**\n") +
        ("**" + t.slice(0, 180) + "**") +
        (b ? ("\n" + b.slice(0, 1500)) : "") +
        ("\nView: https://state789.site/dashboard/" + encodeURIComponent(String(allianceCode || "").toUpperCase()) + "/announcements");

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: "789",
        p_alliance_code: String(allianceCode || "").toUpperCase(),
        p_kind: "announcements",
        p_channel_id: discordChannelId || "",
        p_message: msg,
      } as any);

      if (q.error) throw q.error;

      setTitle(""); setBody(""); setPinned(false);
      await load();
      alert("Posted + queued to Discord ✅");
    } catch (e) {
      console.error(e);
      alert("Post+Send failed (DB/RLS/queue).");
    } finally {
      setSaving(false);
    }
  };

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("alliance_announcements").insert({
        alliance_code: allianceCode,
        title: title.trim(),
        body: body.trim() || null,
        pinned,
      } as any);
      if (error) throw error;
      setTitle(""); setBody(""); setPinned(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Create failed (permissions or DB).");
    } finally {
      setSaving(false);
    }
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📣 Announcements</h2>
        <a href={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ textDecoration: "none" }}>← Back</a>
      </div>

      {canManage ? (
        <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>New announcement</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ width: "100%", padding: 10, borderRadius: 10, marginBottom: 8 }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (optional)" rows={4} style={{ width: "100%", padding: 10, borderRadius: 10, marginBottom: 8 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Discord channel</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />
            Auto-send to Discord
          </label>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
            Tip: leave Channel blank to use the default Discord channel.
          </div>
            <DiscordChannelSelect
              scope="alliance"
              kind="announcements"
              stateCode="789"
              allianceCode={allianceCode}
              value={discordChannelId}
              onChange={setDiscordChannelId}
            />
          </div><button disabled={saving || !title.trim()} onClick={create} style={{ padding: "10px 12px", borderRadius: 10 }}>
            {saving ? "Posting…" : "Post"}
          </button>
          <button
            disabled={saving || !title.trim()}
            onClick={async () => {
              const t = title.trim();
              if (!t) return;

              setSaving(true);
              try {
                const { error } = await supabase.from("alliance_announcements").insert({
                  alliance_code: allianceCode,
                  title: t,
                  body: body.trim() || null,
                  pinned,
                } as any);
                if (error) throw error;

                const b = body.trim();

                const msg =
                  ("📣 **" + String(allianceCode || "").toUpperCase() + " Announcement**\n") +
                  ("**" + t.slice(0, 180) + "**") +
                  (b ? ("\n" + b.slice(0, 1500)) : "") +
                  ("\nView: https://state789.site/dashboard/" + encodeURIComponent(String(allianceCode || "").toUpperCase()) + "/announcements");

                const q = await supabase.rpc("queue_discord_send" as any, {
                  p_state_code: "789",
                  p_alliance_code: String(allianceCode || "").toUpperCase(),
                  p_kind: "announcements",
                  p_channel_id: discordChannelId || "",
                  p_message: msg,
                } as any);

                if (q.error) throw q.error;

                setTitle(""); setBody(""); setPinned(false);
                await load();
                alert("Posted + queued to Discord ✅");
              } catch (e) {
                console.error(e);
                alert("Post+Send failed (DB/RLS/queue).");
              } finally {
                setSaving(false);
              }
            }}
            style={{ padding: "10px 12px", borderRadius: 10, marginLeft: 8 }}
          >
            {saving ? "Posting+Sending…" : "Post"}
          </button>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{a.pinned ? "📌 " : ""}{a.title}</div>
                    {a.created_at ? <div style={{ opacity: 0.6, marginTop: 4, fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</div> : null}
                  </div>
                  {canManage ? (
                    <button onClick={() => del(a.id)} style={{ padding: "8px 10px", borderRadius: 10 }}>Delete</button>
                  ) : null}
                </div>
                {a.body ? <div style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.9 }}>{a.body}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Player Profile & HQs --- */}
      <PlayerProfileAndHqsPanel />
      {/* --- /Player Profile & HQs --- */}

    </div>
  );
}




