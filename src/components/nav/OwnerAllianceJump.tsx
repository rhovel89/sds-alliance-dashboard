import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type AllianceOpt = { code: string; name?: string | null };

async function isDashboardOwnerSafe(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_dashboard_owner" as any);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

async function fetchAlliancesSafe(): Promise<AllianceOpt[]> {
  const tableCandidates = ["alliances", "alliance_registry", "alliances_list", "alliance_directory"];
  const selectCandidates = [
    "code,name",
    "code,title",
    "code,display_name",
    "alliance_code,name",
    "alliance_code,title",
    "alliance_code,display_name",
  ];

  for (const table of tableCandidates) {
    for (const sel of selectCandidates) {
      try {
        const r = await supabase.from(table as any).select(sel as any).limit(500);
        if ((r as any).error) continue;

        const rows = ((r as any).data ?? []) as any[];
        if (!rows.length) return [];

        // Normalize to {code,name}
        const out: AllianceOpt[] = rows
          .map((x) => {
            const code = (x.code ?? x.alliance_code ?? "").toString().trim();
            const name = (x.name ?? x.title ?? x.display_name ?? null) as any;
            return code ? { code, name } : null;
          })
          .filter(Boolean) as any;

        if (out.length) {
          // unique by code
          const seen = new Set<string>();
          const uniq = out.filter((a) => (seen.has(a.code) ? false : (seen.add(a.code), true)));
          uniq.sort((a, b) => a.code.localeCompare(b.code));
          return uniq;
        }
      } catch {
        // ignore and continue
      }
    }
  }

  return [];
}

export function OwnerAllianceJump() {
  const nav = useNavigate();
  const admin = useIsAppAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alliances, setAlliances] = useState<AllianceOpt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const show = useMemo(() => {
    return !!isOwner || !!admin.isAdmin;
  }, [isOwner, admin.isAdmin]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const o = await isDashboardOwnerSafe();
      if (cancelled) return;
      setIsOwner(o);

      // Only fetch list if allowed
      const allowed = o || !!admin.isAdmin;
      if (!allowed) {
        setLoading(false);
        return;
      }

      const list = await fetchAlliancesSafe();
      if (cancelled) return;

      setAlliances(list);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [admin.isAdmin]);

  if (!show) return null;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ opacity: 0.85, fontSize: 12 }}>Admin Jump:</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const code = (e.target.value || "").toString().trim();
          if (!code) return;
          nav("/dashboard/" + code);
        }}
        style={{
          height: 34,
          borderRadius: 10,
          padding: "0 10px",
          border: "1px solid rgba(120,255,120,0.25)",
          background: "rgba(0,0,0,0.35)",
          color: "rgba(235,255,235,0.95)",
          outline: "none",
        }}
        title="Jump to any alliance dashboard (Owner/Admin)"
      >
        <option value="">
          {loading ? "Loading…" : alliances.length ? "Select alliance…" : (error ? error : "No alliances")}
        </option>
        {alliances.map((a) => (
          <option key={a.code} value={a.code}>
            {a.code}{a.name ? " — " + a.name : ""}
          </option>
        ))}
      </select>
    </div>
  );
}