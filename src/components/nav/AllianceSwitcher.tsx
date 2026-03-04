import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Membership = { alliance_code: string; role: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

function getAllianceFromParams(params: any): string {
  return upper(params?.allianceCode ?? params?.alliance_id ?? params?.code ?? "");
}

export default function AllianceSwitcher() {
  const nav = useNavigate();
  const loc = useLocation();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selected, setSelected] = useState<string>("");

  const [playerId, setPlayerId] = useState<string | null>(null);
  const rtRef = useRef<any>(null);

  const currentFromParams = useMemo(() => getAllianceFromParams(params), [params]);
  const currentFromQuery = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return upper(sp.get("alliance"));
  }, [loc.search]);

  const selectedRole = useMemo(() => {
    const m = memberships.find((x) => upper(x.alliance_code) === upper(selected));
    return m?.role ?? null;
  }, [memberships, selected]);

  const isManager = useMemo(() => isManagerRole(selectedRole), [selectedRole]);

  const loadMemberships = useCallback(async () => {
    let cancelled = false;
    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      if (!uid) {
        if (!cancelled) {
          setMemberships([]);
          setSelected("");
          setPlayerId(null);
        }
        return;
      }

      // Find player id (do NOT create rows here; just read)
      let pid: string | null = null;
      const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
      if (!p1.error && p1.data?.id) pid = String(p1.data.id);

      if (!pid) {
        if (!cancelled) {
          setMemberships([]);
          setSelected("");
          setPlayerId(null);
        }
        return;
      }

      if (!cancelled) setPlayerId(pid);

      const mRes = await supabase
        .from("player_alliances")
        .select("alliance_code,role")
        .eq("player_id", pid)
        .order("alliance_code", { ascending: true });

      if (mRes.error) throw mRes.error;

      const ms = (mRes.data ?? []).map((r: any) => ({
        alliance_code: upper(r.alliance_code),
        role: (r.role ?? null) as any,
      })) as Membership[];

      if (cancelled) return;

      setMemberships(ms);

      // Compute best selection
      const stored = upper(localStorage.getItem("selected_alliance"));
      const urlPreferred = currentFromParams || currentFromQuery;

      const allowed = new Set(ms.map((x) => upper(x.alliance_code)));

      let next =
        (urlPreferred && allowed.has(upper(urlPreferred)) ? upper(urlPreferred) : "") ||
        (stored && allowed.has(upper(stored)) ? upper(stored) : "") ||
        (ms[0]?.alliance_code ?? "");

      // If none allowed, clear storage + selection
      if (!next) {
        localStorage.removeItem("selected_alliance");
        if (!cancelled) setSelected("");
        return;
      }

      // If stored selection is no longer valid, clear it
      if (stored && !allowed.has(stored)) localStorage.removeItem("selected_alliance");

      if (!cancelled) {
        setSelected(next);
        localStorage.setItem("selected_alliance", next);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [currentFromParams, currentFromQuery]);

  // Initial load + refresh on focus/visibility
  useEffect(() => {
    void loadMemberships();

    const onFocus = () => void loadMemberships();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadMemberships();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadMemberships]);

  // Realtime refresh when player_alliances changes for this player
  useEffect(() => {
    if (!playerId) return;

    // cleanup previous
    try {
      if (rtRef.current) supabase.removeChannel(rtRef.current);
    } catch {}

    const ch = supabase
      .channel("rt-player-alliances-" + playerId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_alliances", filter: `player_id=eq.${playerId}` },
        () => { void loadMemberships(); }
      )
      .subscribe();

    rtRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [playerId, loadMemberships]);

  // Keep in sync if URL indicates a valid alliance
  useEffect(() => {
    const next = currentFromParams || currentFromQuery;
    if (!next) return;

    const allowed = new Set(memberships.map((x) => upper(x.alliance_code)));
    if (!allowed.has(upper(next))) return;

    if (upper(next) !== upper(selected)) {
      setSelected(upper(next));
      localStorage.setItem("selected_alliance", upper(next));
    }
  }, [currentFromParams, currentFromQuery, memberships, selected]);

  const onChange = (codeRaw: string) => {
    const code = upper(codeRaw);
    setSelected(code);
    localStorage.setItem("selected_alliance", code);

    const path = loc.pathname;

    // If user is currently inside /dashboard/<code>/..., keep the same sub-path when switching
    if (path.startsWith("/dashboard/")) {
      const rest = path.replace(/^\/dashboard\/[^/]+/, ""); // keep /calendar, /hq-map, etc
      nav(`/dashboard/${encodeURIComponent(code)}${rest}${loc.search}`, { replace: true });
      return;
    }

    // Otherwise, default to personal dashboard (ME)
    const sp = new URLSearchParams(loc.search);
    sp.set("alliance", code);
    nav(`/me?${sp.toString()}`, { replace: true });
  };

  if (loading || memberships.length === 0) return null;

  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ opacity: 0.8, fontSize: 12 }}>Alliance</span>
      <select value={selected} onChange={(e) => onChange(e.target.value)}>
        {memberships.map((m) => (
          <option key={m.alliance_code} value={m.alliance_code}>
            {m.alliance_code}{m.role ? ` (${String(m.role)})` : ""}
          </option>
        ))}
      </select>

      <span style={{ opacity: 0.7, fontSize: 12 }}>{isManager ? "Manager" : "Member"}</span>
    </label>
  );
}
