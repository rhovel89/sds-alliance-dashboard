import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = {
  alliance_code: string;
  membership_id: string;
  player_id: string;
  player_name: string;
  role_key: string;
  role: string;
  hq_count: number;
  max_hq_level: number | null;
  hqs: any[] | null;
};

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function roleLabel(roleKey: string, roleText: string) {
  const k = String(roleKey || "").toLowerCase();
  if (k === "owner") return "Owner";
  if (k === "r5") return "R5";
  if (k === "r4") return "R4";
  if (k === "member") return "Member";
  return roleText || roleKey || "Member";
}

function RoleBadge(props: { roleKey: string; roleText: string }) {
  const k = String(props.roleKey || "").toLowerCase();
  const label = roleLabel(props.roleKey, props.roleText);

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(255,255,255,0.18)",
    opacity: 0.98
  };

  if (k === "owner") return <span style={{ ...style, background: "rgba(120,70,255,0.22)" }}>👑 {label}</span>;
  if (k === "r5") return <span style={{ ...style, background: "rgba(255,70,70,0.20)" }}>🛡️ {label}</span>;
  if (k === "r4") return <span style={{ ...style, background: "rgba(255,160,60,0.18)" }}>⚔️ {label}</span>;
  return <span style={{ ...style, background: "rgba(120,255,120,0.12)" }}>🧟 {label}</span>;
}

async function resolveMyPlayerId(): Promise<string | null> {
  const u = await supabase.auth.getUser();
  const uid = u.data?.user?.id || null;
  if (!uid) return null;

  // direct players.auth_user_id
  const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).limit(1);
  if (!p1.error && p1.data?.[0]?.id) return String(p1.data[0].id);

  // link table
  const link = await supabase.from("player_auth_links").select("player_id").eq("user_id", uid).limit(1);
  if (!link.error && link.data?.[0]?.player_id) return String(link.data[0].player_id);

  return null;
}

export default function AllianceRosterPage() {
  const nav = useNavigate();
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").toUpperCase();

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  const [q, setQ] = useState("");
  const [minHq, setMinHq] = useState("");
  const [showAllHqs, setShowAllHqs] = useState(false);

  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isOwnerAdmin, setIsOwnerAdmin] = useState(false);

  async function load() {
    if (!allianceCode) return;
    setStatus("Loading…");

    // owner/admin check (safe RPC)
    try {
      const own = await supabase.rpc("is_owner_or_admin");
      if (!own.error) setIsOwnerAdmin(!!own.data);
    } catch {}

    // my player id (for self row)
    try {
      const pid = await resolveMyPlayerId();
      setMyPlayerId(pid);
    } catch {}

    // roster
    const r = await supabase.rpc("get_alliance_roster", { p_alliance_code: allianceCode });
    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows((r.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [allianceCode]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = minHq ? Number(minHq) : NaN;
    return rows.filter((x) => {
      const okName = !needle || (x.player_name || "").toLowerCase().includes(needle);
      const okHq = Number.isNaN(min) || ((x.max_hq_level ?? 0) >= min);
      return okName && okHq;
    });
  }, [rows, q, minHq]);

  async function copyJson() {
    try { await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2)); alert("Copied JSON ✅"); }
    catch { alert("Copy failed."); }
  }

  function downloadCsv() {
    const header = ["player_name","role_key","role","hq_count","max_hq_level","hqs"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const hqs = Array.isArray(r.hqs)
        ? r.hqs.map((h:any) => `${h.hq_name || "HQ"}(L${h.hq_level ?? "?"})`).join(" | ")
        : "";
      lines.push([
        csvEscape(r.player_name),
        csvEscape(r.role_key),
        csvEscape(r.role),
        csvEscape(r.hq_count),
        csvEscape(r.max_hq_level ?? ""),
        csvEscape(hqs)
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alliance-roster-${allianceCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setRole(membershipId: string, roleKey: string) {
    const ok = confirm(`Change role to ${roleKey.toUpperCase()}?`);
    if (!ok) return;

    setStatus("Saving role…");
    const r = await supabase.rpc("alliance_set_member_role", { p_membership_id: membershipId, p_role_key: roleKey });
    if (r.error) { setStatus(r.error.message); return; }
    await load();
  }

  async function kick(membershipId: string, playerName: string) {
    const ok = confirm(`Remove ${playerName} from alliance ${allianceCode}?`);
    if (!ok) return;

    setStatus("Removing…");
    const r = await supabase.rpc("alliance_remove_member", { p_membership_id: membershipId });
    if (r.error) { setStatus(r.error.message); return; }
    await load();
  }

  if (!allianceCode) return <div style={{ padding: 16 }}>Missing alliance code in URL.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🧟 Alliance Roster — {allianceCode}</h2>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
            {status || `Members: ${filtered.length}`}
            {isOwnerAdmin ? <span> • Owner tools enabled</span> : null}
          </div>
        </div>
        <SupportBundleButton />
      </div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player name…" />
          <input value={minHq} onChange={(e) => setMinHq(e.target.value)} placeholder="Min HQ level" style={{ width: 120 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
            <input type="checkbox" checked={showAllHqs} onChange={(e) => setShowAllHqs(e.target.checked)} />
            Show all HQs
          </label>
          <button type="button" onClick={() => void load()}>Refresh</button>
          <button type="button" onClick={() => void copyJson()}>Copy JSON</button>
          <button type="button" onClick={downloadCsv}>Download CSV</button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
          View-only roster for members. Owner/Admin can change alliance roles and remove members.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((r) => {
          const isSelf = !!myPlayerId && String(r.player_id) === String(myPlayerId);
          const chips = Array.isArray(r.hqs) ? (showAllHqs ? r.hqs : r.hqs.slice(0, 6)) : [];

          return (
            <div key={r.membership_id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950 }}>{r.player_name}</div>
                  <RoleBadge roleKey={r.role_key} roleText={r.role} />
                  {isSelf ? <span style={{ opacity: 0.8, fontSize: 12 }}>• (you)</span> : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {isSelf ? (
                    <>
                      <button type="button" onClick={() => nav("/me")}>My Dashboard</button>
                      <button type="button" onClick={() => nav("/me/hq-manager")}>HQ Manager</button>
                    </>
                  ) : null}

                  {isOwnerAdmin ? (
                    <>
                      <select
                        value={(r.role_key || "member").toLowerCase()}
                        onChange={(e) => void setRole(r.membership_id, e.target.value)}
                      >
                        <option value="owner">owner</option>
                        <option value="r5">r5</option>
                        <option value="r4">r4</option>
                        <option value="member">member</option>
                      </select>
                      <button type="button" onClick={() => void kick(r.membership_id, r.player_name)}>Remove</button>
                    </>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
                HQs: <b>{r.hq_count}</b> • Max HQ Level: <b>{r.max_hq_level ?? "—"}</b>
              </div>

              {chips.length ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {chips.map((h: any) => (
                    <span
                      key={h.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 12,
                        opacity: 0.95
                      }}
                    >
                      {String(h.hq_name || "HQ")} (L{String(h.hq_level ?? "?")})
                    </span>
                  ))}
                  {Array.isArray(r.hqs) && !showAllHqs && r.hqs.length > 6 ? (
                    <span style={{ opacity: 0.75, fontSize: 12 }}>+{r.hqs.length - 6} more</span>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>No HQs entered yet.</div>
              )}
            </div>
          );
        })}

        {!filtered.length && !status ? <div style={{ opacity: 0.8 }}>No members found.</div> : null}
      </div>
    </div>
  );
}
