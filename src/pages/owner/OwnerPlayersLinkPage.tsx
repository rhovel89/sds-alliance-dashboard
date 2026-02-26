import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import PlayerLookupPanel from "../../components/players/PlayerLookupPanel";

type PlayerRow = {
  id: string;
  game_name?: string | null;
  name?: string | null;
  auth_user_id?: string | null;
  created_at?: string | null;
};

function safeLabel(p: PlayerRow) {
  return (p.game_name || p.name || "(no name)") + ` — ${p.id}`;
}

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert(`${label} copied ✅`);
  } catch {
    // fallback
    prompt(`Copy ${label}:`, text);
  }
}

export default function OwnerPlayersLinkPage() {
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const refetch = async () => {
    setLoading(true);

    // Try selecting the columns we want; if schema differs, fall back to *
    let res = await supabase
      .from("players")
      .select("id,game_name,name,auth_user_id,created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      // fallback: older schema
      const res2 = await supabase.from("players").select("*").limit(1000);
      if (res2.error) {
        console.error(res2.error);
        alert(res2.error.message);
        setLoading(false);
        return;
      }
      setRows((res2.data || []) as PlayerRow[]);
      setLoading(false);
      return;
    }

    setRows((res.data || []) as PlayerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const s = `${r.id} ${(r.game_name || "")} ${(r.name || "")} ${(r.auth_user_id || "")}`.toLowerCase();
      return s.includes(term);
    });
  }, [rows, q]);

  const linkAuthUser = async (player: PlayerRow) => {
    const uuid = prompt(
      `Paste Supabase Auth User UUID to LINK for:\n${safeLabel(player)}\n\n(Example: 01480ad0-....)`,
      player.auth_user_id || ""
    );
    if (uuid == null) return;
    const clean = uuid.trim();
    if (!clean) return alert("UUID required.");
    if (!/^[0-9a-fA-F-]{36}$/.test(clean)) return alert("That doesn't look like a UUID.");

    const { error } = await supabase.from("players").update({ auth_user_id: clean }).eq("id", player.id);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  const unlinkAuthUser = async (player: PlayerRow) => {
    if (!confirm(`UNLINK auth user from:\n${safeLabel(player)}\n\nThis will remove dashboard access linkage.`)) return;

    const { error } = await supabase.from("players").update({ auth_user_id: null }).eq("id", player.id);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginTop: 12 }}>         <PlayerLookupPanel />       </div>
      <h2>🧟 Owner — Players (Link / Unlink)</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={refetch}>↻ Refresh</button>
        <input
          placeholder="Search (name / id / auth uuid)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 280 }}
        />
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Direct link: <code>/owner/players-link</code>
      </div>

      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 1100 }}>
        {filtered.map((p) => (
          <div key={p.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{p.game_name || p.name || "(no name)"}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Player ID: {p.id}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Linked Auth User UUID: {p.auth_user_id ? p.auth_user_id : "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => copyText("Player ID", p.id)}>📋 Copy Player UUID</button>

                {p.auth_user_id ? (
                  <>
                    <button onClick={() => copyText("Auth User UUID", p.auth_user_id!)}>📋 Copy User UUID</button>
                    <button onClick={() => unlinkAuthUser(p)}>🔓 Unlink</button>
                  </>
                ) : (
                  <button onClick={() => linkAuthUser(p)}>🔗 Link User</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No players found.</div> : null}
      </div>
    </div>
  );
}

