import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type FeedItem = {
  kind: "thread" | "thread_post" | "achievement_request";
  ts: string;
  title: string;
  detail?: string;
  to?: string;
};

function iso(v: any) { return String(v || ""); }
function nowIso() { return new Date().toISOString(); }
function safe(s: any) { return (s === null || s === undefined) ? "" : String(s); }

export default function OpsFeedPanel(props: { stateCode: string; limit?: number }) {
  const stateCode = String(props.stateCode || "");
  const limit = props.limit ?? 18;

  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<FeedItem[]>([]);

  async function loadOnce() {
    setStatus("");

    const out: FeedItem[] = [];

    // Threads (safe)
    try {
      const t = await supabase
        .from("ops_threads")
        .select("id,title,scope,alliance_code,state_code,updated_at,pinned")
        .eq("state_code", stateCode)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!t.error) {
        for (const r of (t.data || []) as any[]) {
          out.push({
            kind: "thread",
            ts: iso(r.updated_at || r.created_at || nowIso()),
            title: `Thread: ${safe(r.title)}`,
            detail: r.scope === "alliance" ? `Alliance ${safe(r.alliance_code)}` : `State ${safe(r.state_code)}`,
            to: `/state/${stateCode}/threads#${encodeURIComponent(String(r.id || ""))}`,
          });
        }
      }
    } catch {}

    // Recent thread posts (safe)
    try {
      // posts don't have state_code; we just show newest overall and link to threads page
      const p = await supabase
        .from("ops_thread_posts")
        .select("id,thread_id,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!p.error) {
        for (const r of (p.data || []) as any[]) {
          out.push({
            kind: "thread_post",
            ts: iso(r.created_at || nowIso()),
            title: "Thread reply",
            detail: `Thread ${safe(r.thread_id)}`,
            to: `/state/${stateCode}/threads#${encodeURIComponent(String(r.thread_id || ""))}`,
          });
        }
      }
    } catch {}

    // Achievement requests (safe)
    try {
      const a = await supabase
        .from("state_achievement_requests")
        .select("id,state_code,player_name,alliance_name,status,updated_at,created_at")
        .eq("state_code", stateCode)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!a.error) {
        for (const r of (a.data || []) as any[]) {
          out.push({
            kind: "achievement_request",
            ts: iso(r.updated_at || r.created_at || nowIso()),
            title: `Achievement: ${safe(r.player_name || "Player")}`,
            detail: `${safe(r.alliance_name || "")} • ${safe(r.status || "")}`.trim(),
            to: `/state/${stateCode}/achievements`,
          });
        }
      }
    } catch {}

    out.sort((x, y) => String(y.ts).localeCompare(String(x.ts)));
    setItems(out.slice(0, limit));
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadOnce();

      // Realtime (safe): if tables not enabled, we just keep initial load.
      try {
        const ch = supabase
          .channel(`ops-feed-${stateCode}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "ops_threads", filter: `state_code=eq.${stateCode}` } as any,
            async () => { if (!cancelled) await loadOnce(); }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "state_achievement_requests", filter: `state_code=eq.${stateCode}` } as any,
            async () => { if (!cancelled) await loadOnce(); }
          );

        ch.subscribe();
        return () => { try { supabase.removeChannel(ch); } catch {} };
      } catch {}
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  const pretty = useMemo(() => {
    return (items || []).map((x) => ({
      ...x,
      tsPretty: (() => { try { return new Date(x.ts).toLocaleString(); } catch { return x.ts; } })(),
    }));
  }, [items]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontWeight: 950, fontSize: 14 }}>Live Ops Feed</div>
      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Realtime if enabled • safe fallback if not</div>

      {status ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>{status}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {pretty.map((x, i) => (
          <button
            key={x.kind + ":" + x.ts + ":" + i}
            className="zombie-btn"
            type="button"
            onClick={() => x.to ? window.location.assign(x.to) : null}
            style={{ textAlign: "left", whiteSpace: "normal", opacity: 0.92, width:"100%", display:"block"}}
          >
            <div style={{ fontWeight: 900 }}>{x.title}</div>
            <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
              {x.detail ? `${x.detail} • ` : ""}{x.tsPretty}
            </div>
          </button>
        ))}
        {!pretty.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No recent activity.</div> : null}
      </div>
    </div>
  );
}


