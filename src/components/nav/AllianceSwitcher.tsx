import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getCanonicalPlayerIdForUser } from "../../utils/getCanonicalPlayerId";

type Membership = { alliance_code: string; role: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

function pickAllianceFromParams(params: any): string {
  const raw =
    params?.code ??
    params?.allianceCode ??
    params?.alliance_id ??
    params?.alliance ??
    params?.tag ??
    "";
  return upper(raw);
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

  const currentFromParams = useMemo(() => pickAllianceFromParams(params), [params]);
  const currentFromQuery = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return upper(sp.get("alliance"));
  }, [loc.search]);

  const selectedRole = useMemo(() => {
    const m = memberships.find((x) => upper(x.alliance_code) === upper(selected));
    return m?.role ?? null;
  }, [memberships, selected]);

  const isManager = useMemo(() => isManagerRole(selectedRole), [selectedRole]);

  const clearAll = () => {
    setMemberships([]);
    setSelected("");
    setPlayerId(null);
    try { localStorage.removeItem("selected_alliance"); } catch {}
  };

  const loadMemberships = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      if (!uid) {
        clearAll();
        return;
      }
      const pid = await getCanonicalPlayerIdForUser(uid);
      setPlayerId(pid);
if (!pid) {
        clearAll();
        return;
      }

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

      setMemberships(ms);

      const allowed = new Set(ms.map((x) => upper(x.alliance_code)));
      const stored = upper(localStorage.getItem("selected_alliance"));
      const urlPreferred = currentFromParams || currentFromQuery;

      let next =
        (urlPreferred && allowed.has(urlPreferred) ? urlPreferred : "") ||
        (stored && allowed.has(stored) ? stored : "") ||
        (ms[0]?.alliance_code ?? "");

      if (!next) {
        clearAll();
        return;
      }

      if (stored && !allowed.has(stored)) {
        try { localStorage.removeItem("selected_alliance"); } catch {}
      }

      setSelected(next);
      try { localStorage.setItem("selected_alliance", next); } catch {}
    } catch {
      // key fix: do NOT keep stale memberships visible
      clearAll();
    } finally {
      setLoading(false);
    }
  }, [currentFromParams, currentFromQuery]);

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

  useEffect(() => {
    if (!playerId) return;

    try { if (rtRef.current) supabase.removeChannel(rtRef.current); } catch {}

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

  useEffect(() => {
    const next = currentFromParams || currentFromQuery;
    if (!next) return;

    const allowed = new Set(memberships.map((x) => upper(x.alliance_code)));
    if (!allowed.has(next)) return;

    if (upper(next) !== upper(selected)) {
      setSelected(next);
      try { localStorage.setItem("selected_alliance", next); } catch {}
    }
  }, [currentFromParams, currentFromQuery, memberships, selected]);

  const onChange = (codeRaw: string) => {
    const code = upper(codeRaw);
    setSelected(code);
    try { localStorage.setItem("selected_alliance", code); } catch {}

    const path = loc.pathname;

    if (path.startsWith("/dashboard/")) {
      const rest = path.replace(/^\/dashboard\/[^/]+/, "");
      nav(`/dashboard/${encodeURIComponent(code)}${rest}${loc.search}`, { replace: true });
      return;
    }

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


