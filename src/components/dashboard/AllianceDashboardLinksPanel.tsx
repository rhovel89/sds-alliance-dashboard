import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}
function norm(v: any) {
  return s(v).trim();
}
function normLower(v: any) {
  return norm(v).toLowerCase();
}

function roleAllowed(rolesCsv: string | null | undefined, userRole: string | null | undefined) {
  const csv = normLower(rolesCsv);
  if (!csv) return true;
  const role = normLower(userRole);
  if (!role) return false;
  const allowed = csv.split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(role);
}

export default function AllianceDashboardLinksPanel(props: { allianceCode: string; userRole?: string | null; title?: string }) {
  const allianceCode = norm(props.allianceCode).toUpperCase();
  const userRole = norm(props.userRole || "");
  const title = norm(props.title || "Alliance Links");

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);

      const r = await supabase
        .from("alliance_dashboard_links")
        .select("*")
        .eq("alliance_code", allianceCode)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!r.error) setRows((r.data || []) as AnyRow[]);
      else setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allianceCode) return;
    void loadAll();
  }, [allianceCode]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => roleAllowed(String(r?.roles_csv || ""), userRole));
  }, [rows, userRole]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, AnyRow[]>();
    for (const r of visibleRows) {
      const section = norm(r?.section_name || "General");
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleRows]);

  if (!allianceCode) return null;

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}
      {!loading && visibleRows.length === 0 ? <div style={{ opacity: 0.7 }}>No links available.</div> : null}

      <div style={{ display: "grid", gap: 12 }}>
        {groupedRows.map(([section, links]) => (
          <div key={section}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{section}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {links.map((r) => (
                <a
                  key={String(r?.id || "")}
                  className="zombie-btn"
                  href={String(r?.url || "#")}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: "10px 12px", textDecoration: "none" }}
                >
                  {String(r?.label || "Link")}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

