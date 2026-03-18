import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolveMyPlayerIdentity, listMyAllianceMemberships } from "../../lib/playerIdentity";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowLocal() { try { return new Date().toLocaleString(); } catch { return ""; } }

export default function DossierSheetPage() {
  const nav = useNavigate();

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);

  const [editGameName, setEditGameName] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus("");

      const id = await resolveMyPlayerIdentity();
      if (cancelled) return;

      setUserId(id.userId);
      setPlayerId(id.playerId);
      setPlayer(id.playerRow);

      if (id.playerRow) {
        setEditGameName(s(id.playerRow.game_name || id.playerRow.name));
        setEditName(s(id.playerRow.name || id.playerRow.game_name));
      }

      if (id.playerId) {
        const m = await listMyAllianceMemberships(id.playerId);
        if (!cancelled) setMemberships(m);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveIdentity() {
    try {
      setStatus("");
      if (!playerId) {
        setStatus("No player id found.");
        return;
      }

      const patch: any = {
        name: s(editName).trim() || null,
        game_name: s(editGameName).trim() || null,
        updated_at: new Date().toISOString(),
      };

      const up = await supabase.from("players").update(patch).eq("id", playerId);
      if (up.error) {
        setStatus(up.error.message);
        return;
      }

      const fresh = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
      if (!fresh.error) setPlayer(fresh.data);

      setStatus("Saved ✅");
      window.setTimeout(() => setStatus(""), 900);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Save failed"));
    }
  }

  function printSheet() {
    try { window.print(); } catch {}
  }

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>My Dossier Sheet</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7 }}>
              Printable version of your dossier.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={printSheet} style={{ padding: "10px 12px" }}>
              Print / Save PDF
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")} style={{ padding: "10px 12px" }}>
              Back to My Dossier
            </button>
          </div>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 12 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap: 10, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Generated: {nowLocal()}</div>
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              user_id: <code>{userId || "(none)"}</code><br/>
              player_id: <code>{playerId || "(none)"}</code>
            </div>
          </div>

          {!playerId ? (
            <div style={{ marginTop: 12, opacity: 0.8 }}>
              No player identity link found yet.
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Display Name</div>
                <input
                  value={editName}
                  onChange={(e)=>setEditName(e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Game Name</div>
                <input
                  value={editGameName}
                  onChange={(e)=>setEditGameName(e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
                />
              </div>
              <div style={{ gridColumn:"1 / -1", display:"flex", gap: 10, flexWrap:"wrap" }}>
                <button className="zombie-btn" type="button" onClick={saveIdentity}>Save Identity</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Source: player_alliances
          </div>

          <div style={{ marginTop: 12, display:"flex", flexDirection:"column", gap: 8 }}>
            {memberships.map((m: any, i: number) => (
              <div key={String(m.id || i)} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {String(m.alliance_code || m.alliance_id || "Alliance")}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • role: {String(m.role || "")}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  state_code: {String(m.state_code || "")} • created: {m.created_at ? new Date(String(m.created_at)).toLocaleString() : ""}
                </div>
              </div>
            ))}
            {!memberships.length ? <div style={{ opacity: 0.8 }}>No memberships found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
