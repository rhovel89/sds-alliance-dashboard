import { useEffect, useMemo, useState } from "react";
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

  // Load memberships for current user
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;

        if (!uid) {
          if (!cancelled) {
            setMemberships([]);
            setSelected("");
          }
          return;
        }

        // Ensure player row exists
        let pid: string | null = null;
        const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p1.error && p1.data?.id) {
          pid = String(p1.data.id);
        } else {
          const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
          if (!ins.error && ins.data?.id) pid = String(ins.data.id);
        }

        if (!pid) {
          if (!cancelled) {
            setMemberships([]);
            setSelected("");
          }
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

        if (cancelled) return;

        setMemberships(ms);

        // Pick initial
        const stored = upper(localStorage.getItem("selected_alliance"));
        const initial =
          currentFromParams ||
          currentFromQuery ||
          stored ||
          ms[0]?.alliance_code ||
          "";

        setSelected(initial);
        if (initial) localStorage.setItem("selected_alliance", initial);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync if URL params change (ex: navigating to /dashboard/OZ)
  useEffect(() => {
    const next = currentFromParams || currentFromQuery;
    if (next && upper(next) !== upper(selected)) {
      setSelected(upper(next));
      localStorage.setItem("selected_alliance", upper(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFromParams, currentFromQuery]);

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

      {/* tiny hint so you can see role at a glance */}
      <span style={{ opacity: 0.7, fontSize: 12 }}>
        {isManager ? "Manager" : "Member"}
      </span>
    </label>
  );
}
