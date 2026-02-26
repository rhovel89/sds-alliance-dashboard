import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type LinkRow = { player_id: string; user_id: string };

type Item = {
  player_id: string;
  display_name: string;
  primary_user_id: string | null;
  linked_user_ids: string[];
};

function short(id?: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…" + id.slice(-4);
}

async function copyText(s: string) {
  try { await navigator.clipboard.writeText(s); } catch { alert("Copy failed."); }
}

export default function PlayerLookupPanel(props: { title?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      setStatus("Loading players…");

      const pRes = await supabase
        .from("players")
        .select("id,name,game_name,auth_user_id")
        .order("name", { ascending: true });

      if (pRes.error) { setStatus(pRes.error.message); return; }

      const lRes = await supabase
        .from("player_auth_links")
        .select("player_id,user_id");

      const links = (lRes.data ?? []) as LinkRow[];

      const byPlayer = new Map<string, string[]>();
      for (const l of links) {
        const arr = byPlayer.get(l.player_id) ?? [];
        arr.push(l.user_id);
        byPlayer.set(l.player_id, arr);
      }

      const rows = (pRes.data ?? []) as PlayerRow[];

      const out: Item[] = rows.map((r) => {
        const display = (r.name || r.game_name || "Unnamed Player").toString();
        const linked = byPlayer.get(r.id) ?? [];
        const primary = r.auth_user_id || (linked.length ? linked[0] : null);

        return {
          player_id: r.id,
          display_name: display,
          primary_user_id: primary,
          linked_user_ids: Array.from(new Set([...(r.auth_user_id ? [r.auth_user_id] : []), ...linked])),
        };
      });

      setItems(out);
      setStatus(`${out.length} players loaded ✅`);
      window.setTimeout(() => setStatus(""), 900);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 12);
    return items
      .filter((x) => (x.display_name || "").toLowerCase().includes(s))
      .slice(0, 20);
  }, [items, q]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title || "Player Lookup (Name → IDs)"}</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Search player name to find the correct IDs for permissions & linking. {status ? " • " + status : ""}
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search player name…"
          style={{ minWidth: 240, width: "min(520px, 100%)" }}
        />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((x) => (
          <div key={x.player_id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>{x.display_name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => copyText(x.display_name)}>Copy Name</button>
                {x.primary_user_id ? <button type="button" onClick={() => copyText(x.primary_user_id!)}>Copy User ID</button> : null}
                <button type="button" onClick={() => copyText(x.player_id)}>Copy Player ID</button>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, display: "grid", gap: 6 }}>
              <div><b>Primary user_id:</b> {x.primary_user_id ? x.primary_user_id : "—"} <span style={{ opacity: 0.7 }}>({short(x.primary_user_id)})</span></div>
              <div><b>Player ID:</b> {x.player_id} <span style={{ opacity: 0.7 }}>({short(x.player_id)})</span></div>
              <div><b>Linked user_ids:</b> {x.linked_user_ids.length ? x.linked_user_ids.map(short).join(", ") : "—"}</div>
            </div>
          </div>
        ))}
        {!filtered.length ? <div style={{ opacity: 0.8 }}>No matches.</div> : null}
      </div>
    </div>
  );
}
