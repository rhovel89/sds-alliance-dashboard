import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  alliance_id: string;
  created_at: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  pinned: boolean;
  is_acked: boolean;
  created_by_name?: string | null;
};

export default function MeAllianceAlertsPanel(props: { allianceId: string | null; allianceCode?: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const aid = props.allianceId;
    if (!aid) {
      setRows([]);
      setStatus("");
      return;
    }
    setStatus("Loading…");
    const res = await supabase
      .from("v_my_alliance_alerts")
      .select("*")
      .eq("alliance_id", aid)
      .order("created_at", { ascending: false })
      .limit(12);

    if (res.error) {
      setStatus(res.error.message);
      return;
    }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.allianceId]);

  const unacked = useMemo(() => rows.filter((r) => !r.is_acked).length, [rows]);
  const pinned = useMemo(() => rows.filter((r) => r.pinned).slice(0, 3), [rows]);

  const link = props.allianceId ? `/dashboard/${props.allianceId}/alerts` : "";

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
        Alliance Alerts {props.allianceCode ? `• ${props.allianceCode}` : ""} {status ? ` • ${status}` : ""}
      </div>
      <div style={{ padding: 12 }}>
        {!props.allianceId ? (
          <div style={{ opacity: 0.75 }}>Select an alliance profile to see alliance alerts.</div>
        ) : (
          <>
            <div style={{ opacity: 0.85 }}>
              Unacked: <b>{unacked}</b> • Total: <b>{rows.length}</b>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800 }}>Pinned</div>
              {pinned.length === 0 ? (
                <div style={{ opacity: 0.7 }}>None pinned.</div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {pinned.map((r) => (
                    <div key={r.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 900 }}>[{r.severity.toUpperCase()}] {r.title}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>
                        {new Date(r.created_at).toLocaleString()} • {r.created_by_name ?? "Unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              {link ? <Link to={link}>Open Alliance Alerts</Link> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
