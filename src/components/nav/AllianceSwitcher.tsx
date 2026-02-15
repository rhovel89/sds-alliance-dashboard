import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Membership = { alliance_id: string; role: string };
type AllianceRow = { code: string; name: string; enabled: boolean };

function getCurrentDashboardSegment(pathname: string) {
  // /dashboard/:alliance_id/calendar  OR /dashboard/:alliance_id/hq-map
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return "calendar";
  // parts: ["dashboard", "SDS", "calendar"]
  return parts[2] || "calendar";
}

export default function AllianceSwitcher() {
  const nav = useNavigate();
  const loc = useLocation();

  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [alliances, setAlliances] = useState<Record<string, AllianceRow>>({});
  const [loading, setLoading] = useState(true);

  const currentSegment = useMemo(() => getCurrentDashboardSegment(loc.pathname), [loc.pathname]);

  const currentAlliance = useMemo(() => {
    const parts = loc.pathname.split("/").filter(Boolean);
    if (parts[0] === "dashboard" && parts[1]) return String(parts[1]).toUpperCase();
    return "";
  }, [loc.pathname]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? null;

      if (!alive) return;
      setUserId(uid);

      if (!uid) {
        setMemberships([]);
        setAlliances({});
        setLoading(false);
        return;
      }

      const m = await supabase
        .from("alliance_memberships")
        .select("alliance_id, role")
        .eq("user_id", uid)
        .order("alliance_id", { ascending: true });

      if (!alive) return;

      const mems = (m.data ?? []) as any as Membership[];
      setMemberships(mems);

      const codes = mems.map((x) => x.alliance_id);
      if (codes.length) {
        const a = await supabase
          .from("alliances")
          .select("code, name, enabled")
          .in("code", codes);

        if (!alive) return;

        const map: Record<string, AllianceRow> = {};
        (a.data ?? []).forEach((row: any) => {
          map[String(row.code).toUpperCase()] = row as AllianceRow;
        });
        setAlliances(map);
      } else {
        setAlliances({});
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div style={{ opacity: 0.8, fontSize: 12 }}>Loading alliances…</div>;
  }

  if (!userId) {
    return <div style={{ opacity: 0.85, fontSize: 12 }}>Not signed in</div>;
  }

  if (memberships.length === 0) {
    return <div style={{ opacity: 0.85, fontSize: 12 }}>No alliance access</div>;
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, opacity: 0.85 }}>Alliance:</span>

      <select
        value={currentAlliance || memberships[0].alliance_id}
        onChange={(e) => {
          const code = String(e.target.value).toUpperCase();
          // keep same segment if possible
          const seg = currentSegment || "calendar";
          nav(`/dashboard/${code}/${seg}`);
        }}
      >
        {memberships.map((m) => {
          const code = String(m.alliance_id).toUpperCase();
          const name = alliances[code]?.name || code;
          return (
            <option key={code} value={code}>
              {code} — {name} ({m.role})
            </option>
          );
        })}
      </select>

      <a href="/dashboard" style={{ fontSize: 12 }}>My Dashboards</a>
    </div>
  );
}
