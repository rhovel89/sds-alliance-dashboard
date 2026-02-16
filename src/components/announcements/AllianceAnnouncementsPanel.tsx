import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

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

export default function AllianceAnnouncementsPanel() {
  const params = useParams();
  const allianceCode = useMemo(() => getAllianceCodeFromParams(params as any).toUpperCase().trim(), [params]);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alliance_announcements")
        .select("id, alliance_code, title, body, pinned, created_at")
        .eq("alliance_code", allianceCode)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setItems((data as any) ?? []);
    } catch {
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
    } catch {
      setCanManage(false);
    }
  };

  useEffect(() => {
    if (!allianceCode) return;
    load();
    loadPerms();
    const ch = supabase
      .channel("ann_panel_" + allianceCode)
      .on("postgres_changes", { event: "*", schema: "public", table: "alliance_announcements", filter: "alliance_code=eq." + allianceCode }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>📣 Announcements</h3>
        {allianceCode ? (
          <a href={`/dashboard/${encodeURIComponent(allianceCode)}/announcements`} style={{ textDecoration: "none" }}>
            View all →
          </a>
        ) : null}
      </div>

      {loading ? (
        <div style={{ padding: 10, opacity: 0.85 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 10, opacity: 0.85 }}>No announcements yet.</div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {items.map((a) => (
            <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>
                {a.pinned ? "📌 " : ""}{a.title}
              </div>
              {a.body ? <div style={{ opacity: 0.85, marginTop: 6, whiteSpace: "pre-wrap" }}>{a.body}</div> : null}
              {a.created_at ? <div style={{ opacity: 0.6, marginTop: 8, fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</div> : null}
            </div>
          ))}
        </div>
      )}

      {canManage ? (
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Tip: Manage announcements in “View all →”.
        </div>
      ) : null}
    </div>
  );
}
