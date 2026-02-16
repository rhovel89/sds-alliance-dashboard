import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsStateLeader } from "../../hooks/useIsStateLeader";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type AllianceRow = {
  code: string;
  name: string;
};

export default function StateDashboardPage() {
  
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});

  const loadLeaderNames = async (userIds: string[]) => {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (ids.length === 0) {
      setNameByUserId({});
      return;
    }

    const attempts: Array<{ userCol: string; select: string }> = [
      { userCol: "auth_user_id", select: "auth_user_id,game_name,name" },
      { userCol: "auth_user_id", select: "auth_user_id,game_name" },
      { userCol: "user_id", select: "user_id,game_name,name" },
      { userCol: "user_id", select: "user_id,game_name" },
    ];

    for (const a of attempts) {
      const { data, error } = await supabase
        .from("players")
        .select(a.select)
        .in(a.userCol as any, ids);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          const key = (row as any)[a.userCol];
          const label = (row as any).game_name || (row as any).name || key;
          if (key) map[key] = label;
        }
        setNameByUserId(map);
        return;
      }
    }

    setNameByUserId({});
  };

  useEffect(() => {
    (async () => {
      const ids = ((leaders ?? []) as any[]).map((r) => (r as any)?.user_id).filter(Boolean);
      await loadLeaderNames(ids as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaders]);
const { isStateLeader } = useIsStateLeader();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const a1 = await supabase
      .from("state_announcements")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!a1.error) setAnnouncements((a1.data ?? []) as Announcement[]);

    // IMPORTANT: keep this select minimal to avoid schema mismatches
    const a2 = await supabase
      .from("alliances")
      .select("code,name")
      .order("name", { ascending: true });

    if (!a2.error) setAlliances((a2.data ?? []) as AllianceRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const post = async () => {
    if (!isStateLeader) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return alert("Title + message required.");

    setBusy(true);
    const res = await supabase.from("state_announcements").insert({ title: t, body: b });
    setBusy(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }

    setTitle("");
    setBody("");
    await load();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 State 789 Dashboard</h2>

      <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📢 State Announcements</div>

          {isStateLeader ? (
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Write your announcement..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={post} disabled={busy}>Post</button>
                <button onClick={load} disabled={busy}>Refresh</button>
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.8, marginBottom: 10 }}>
              You have view-only access. (State Leaders can post.)
            </div>
          )}

          {announcements.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No announcements yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {announcements.map((x) => (
                <div key={x.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>{x.title}</div>
                  <div style={{ opacity: 0.85, fontSize: 12, marginTop: 2 }}>
                    {new Date(x.created_at).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{x.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>🏰 Alliance Directory</div>
          {alliances.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No alliances found.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {alliances.map((a) => (
                <div key={a.code} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 800 }}>{a.name}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>{a.code}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

