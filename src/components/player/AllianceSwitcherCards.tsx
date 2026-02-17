import { supabase } from "../../lib/supabaseClient";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type AllianceOpt = { code: string; name?: string | null; role?: string | null };

function upperCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function roleCanManage(role: string | null | undefined, isAdmin: boolean) {
  const r = String(role ?? "").toLowerCase();
  return isAdmin || ["owner", "r5", "r4"].includes(r);
}

export default function AllianceSwitcherCards() {
  const nav = useNavigate();
  const params = useParams();

  const rawParam =
    (params as any)?.allianceCode ??
    (params as any)?.code ??
    (params as any)?.alliance ??
    (params as any)?.tag ??
    "";

  const routeAllianceCode = useMemo(() => upperCode(rawParam), [rawParam]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [alliances, setAlliances] = useState<AllianceOpt[]>([]);
  const [selected, setSelected] = useState<string>("");

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [myHqSlots, setMyHqSlots] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const selectedAlliance = useMemo(
    () => alliances.find((a) => upperCode(a.code) === upperCode(selected)) ?? null,
    [alliances, selected]
  );

  const canManage = useMemo(() => {
    return roleCanManage(selectedAlliance?.role ?? null, isAdmin);
  }, [selectedAlliance, isAdmin]);

  const viewParam = canManage ? "" : "?view=1";

  useEffect(() => {
    if (routeAllianceCode) setSelected(routeAllianceCode);
  }, [routeAllianceCode]);

  // Load user + alliances list
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;

        const userId = u?.user?.id ?? null;
        if (!userId) {
          setUid(null);
          setAlliances([]);
          setLoading(false);
          return;
        }

        if (cancelled) return;
        setUid(userId);

        // Admin check (best effort)
        try {
          const { data } = await supabase.rpc("is_app_admin");
          if (typeof data === "boolean") setIsAdmin(data);
        } catch {}

        // memberships (preferred): players -> player_alliances
        let codes: string[] = [];
        let roleByCode: Record<string, string> = {};

        const { data: player, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (!pErr && player?.id) {
          const { data: pa, error: paErr } = await supabase
            .from("player_alliances")
            .select("alliance_code,role")
            .eq("player_id", player.id);

          if (!paErr && Array.isArray(pa)) {
            for (const row of pa as any[]) {
              const c = upperCode(row?.alliance_code);
              if (!c) continue;
              codes.push(c);
              if (row?.role != null) roleByCode[c] = String(row.role);
            }
          }
        }

        // fallback: alliance_members -> alliances
        if (codes.length -eq 0) {
          try {
            const { data: am, error: amErr } = await supabase
              .from("alliance_members")
              .select("alliance_id,role")
              .eq("user_id", userId);

            if (!amErr && Array.isArray(am) && am.length) {
              $null = 1
              const ids = (am as any[]).map((r) => r?.alliance_id).filter(Boolean);
              const roleById: Record<string, string> = {};
              for (const r of am as any[]) {
                if (r?.alliance_id && r?.role != null) roleById[String(r.alliance_id)] = String(r.role);
              }

              const { data: als, error: aErr } = await supabase
                .from("alliances")
                .select("id,code,name")
                .in("id", ids);

              if (!aErr && Array.isArray(als)) {
                for (const a of als as any[]) {
                  const c = upperCode(a?.code);
                  if (!c) continue;
                  codes.push(c);
                  roleByCode[c] = roleById[String(a?.id)] ?? roleByCode[c] ?? null;
                }
              }
            }
          } catch {}
        }

        codes = Array.from(new Set(codes.map(upperCode).filter(Boolean)));

        if (codes.length === 0) {
          setAlliances([]);
          setLoading(false);
          return;
        }

        // Load alliance names
        const { data: als2, error: a2Err } = await supabase
          .from("alliances")
          .select("code,name")
          .in("code", codes);

        if (a2Err) throw a2Err;

        const opts: AllianceOpt[] = (als2 ?? [])
          .map((a: any) => {
            const c = upperCode(a?.code);
            return { code: c, name: a?.name ?? c, role: roleByCode[c] ?? null };
          })
          .sort((x, y) => x.code.localeCompare(y.code));

        if (cancelled) return;

        setAlliances(opts);

        const last = upperCode(localStorage.getItem("player.lastAlliance") || "");
        const routeOk = routeAllianceCode && opts.some((o) => o.code === routeAllianceCode);
        const lastOk = last && opts.some((o) => o.code === last);

        const pick = routeOk ? routeAllianceCode : (lastOk ? last : opts[0].code);
        setSelected(pick);

        if (routeAllianceCode && !routeOk) {
          nav(`/dashboard/${encodeURIComponent(pick)}`, { replace: true });
        }

      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nav, routeAllianceCode]);

  // Load live cards
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!uid || !selected) {
        setAnnouncements([]);
        setGuides([]);
        setMyHqSlots([]);
        setEvents([]);
        return;
      }

      localStorage.setItem("player.lastAlliance", upperCode(selected));

      // Announcements
      try {
        const { data, error } = await supabase
          .from("alliance_announcements")
          .select("id,alliance_code,title,body,pinned,created_at")
          .eq("alliance_code", upperCode(selected))
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5);
        if (!cancelled && !error) setAnnouncements((data ?? []) as any[]);
      } catch {}

      // Guides
      try {
        const { data, error } = await supabase
          .from("guide_sections")
          .select("id,alliance_code,title,description,mode,updated_at,created_at")
          .eq("alliance_code", upperCode(selected))
          .order("updated_at", { ascending: false })
          .limit(6);
        if (!cancelled && !error) setGuides((data ?? []) as any[]);
      } catch {}

      // My HQ slots
      try {
        const { data, error } = await supabase
          .from("alliance_hq_map")
          .select("id,alliance_id,slot_number,slot_x,slot_y,label,player_x,player_y,assigned_user_id,updated_at")
          .eq("alliance_id", upperCode(selected))
          .eq("assigned_user_id", uid)
          .order("slot_number", { ascending: true });
        if (!cancelled && !error) setMyHqSlots((data ?? []) as any[]);
      } catch {}

      // Events preview (best effort)
      try {
        const todayIso = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("alliance_events")
          .select("*")
          .eq("alliance_code", upperCode(selected))
          .gte("date", todayIso)
          .order("date", { ascending: true })
          .limit(5);
        if (!cancelled && !error) setEvents((data ?? []) as any[]);
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [uid, selected]);

  const onPickAlliance = (nextRaw: string) => {
    const next = upperCode(nextRaw);
    if (!next) return;
    setSelected(next);
    nav(`/dashboard/${encodeURIComponent(next)}`);
  };

  if (loading) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
        Loading your dashboard…
      </div>
    );
  }

  if (!uid) return null;

  if (err) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
        <b>Dashboard error:</b> {err}
      </div>
    );
  }

  if (alliances.length === 0) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
        <b>No alliance assigned yet.</b>
        <div style={{ marginTop: 6, opacity: 0.8 }}>
          If you’ve already been approved, ask an Owner to assign you to an alliance.
        </div>
      </div>
    );
  }

  const code = upperCode(selected);
  const roleLabel = String(selectedAlliance?.role ?? "").trim();
  const canManageFinal = roleCanManage(selectedAlliance?.role ?? null, isAdmin);
  const viewParamFinal = canManageFinal ? "" : "?view=1";

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          {selectedAlliance?.name || code} <span style={{ opacity: 0.75 }}>({code})</span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.75, fontSize: 12 }}>Alliance</span>
          <select value={code} onChange={(e) => onPickAlliance(e.target.value)} style={{ padding: "6px 10px", borderRadius: 10 }}>
            {alliances.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name || a.code}
              </option>
            ))}
          </select>
        </div>

        {roleLabel ? (
          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", opacity: 0.9 }}>
            Role: {roleLabel}
          </span>
        ) : null}

        {isAdmin ? (
          <Link to="/state" style={{ marginLeft: "auto", opacity: 0.85 }}>State Dashboard →</Link>
        ) : null}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>📣 Announcements</b>
            <Link to={`/dashboard/${encodeURIComponent(code)}/announcements`} style={{ opacity: 0.75, fontSize: 12 }}>View →</Link>
          </div>
          {announcements.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>No announcements yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {announcements.map((a: any) => (
                <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>{String(a?.title ?? "Announcement")}</div>
                    {a?.pinned ? <span style={{ fontSize: 12, opacity: 0.75 }}>📌</span> : null}
                  </div>
                  <div style={{
                    marginTop: 6, opacity: 0.8, fontSize: 13,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any
                  }}>
                    {String(a?.body ?? "")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>📓 Guides</b>
            <Link to={`/dashboard/${encodeURIComponent(code)}/guides`} style={{ opacity: 0.75, fontSize: 12 }}>Open →</Link>
          </div>
          {guides.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>No guide sections yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {guides.map((g: any) => (
                <Link key={g.id} to={`/dashboard/${encodeURIComponent(code)}/guides?section=${encodeURIComponent(String(g.id))}`} style={{ textDecoration: "none" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 800, color: "inherit" }}>{String(g?.title ?? "Section")}</div>
                    {g?.description ? (
                      <div style={{
                        marginTop: 6, opacity: 0.8, fontSize: 13,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any
                      }}>
                        {String(g.description)}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>🗺 HQ Map</b>
            <Link to={`/dashboard/${encodeURIComponent(code)}/hq-map${viewParamFinal}`} style={{ opacity: 0.75, fontSize: 12 }}>
              {canManageFinal ? "Manage →" : "View →"}
            </Link>
          </div>
          {myHqSlots.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>No HQ slot assigned to you yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {myHqSlots.slice(0, 5).map((h: any) => (
                <div key={h.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800 }}>Slot {h?.slot_number ?? "?"}{h?.label ? ` — ${h.label}` : ""}</div>
                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                    Map Slot: ({h?.slot_x ?? "?"},{h?.slot_y ?? "?"})
                    {h?.player_x != null -and h?.player_y != null ? ` • Player HQ: (${h.player_x},${h.player_y})` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!canManageFinal ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>View-only (Owner/R4/R5 can manage).</div> : null}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>📅 Calendar</b>
            <Link to={`/dashboard/${encodeURIComponent(code)}/calendar${viewParamFinal}`} style={{ opacity: 0.75, fontSize: 12 }}>
              {canManageFinal ? "Manage →" : "View →"}
            </Link>
          </div>
          {events.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>(Preview unavailable or no upcoming events.) Use Calendar to view.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {events.slice(0, 4).map((ev: any) => (
                <div key={String(ev?.id ?? Math.random())} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800 }}>{String(ev?.title ?? ev?.name ?? "Event")}</div>
                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>{String(ev?.date ?? ev?.start_at ?? ev?.starts_at ?? "")}</div>
                </div>
              ))}
            </div>
          )}
          {!canManageFinal ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>View-only (Owner/R4/R5 can manage).</div> : null}
        </div>
      </div>
    </div>
  );
}