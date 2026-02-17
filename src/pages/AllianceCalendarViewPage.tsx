import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type AnyRow = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function pickTitle(e: AnyRow) {
  return String(
    e?.title ?? e?.name ?? e?.event_name ?? e?.summary ?? "Untitled"
  );
}

function pickWhen(e: AnyRow) {
  const start =
    e?.start_at ?? e?.starts_at ?? e?.start_time ?? e?.start ?? e?.date ?? e?.day ?? null;
  const end =
    e?.end_at ?? e?.ends_at ?? e?.end_time ?? e?.end ?? null;

  const s = start ? String(start) : "";
  const t = end ? String(end) : "";
  if (s && t) return `${s} → ${t}`;
  return s || t || "";
}

export default function AllianceCalendarViewPage() {
  const params = useParams();
  const allianceCode = useMemo(() => upper((params as any)?.allianceCode), [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [events, setEvents] = useState<AnyRow[]>([]);
  const [filterCol, setFilterCol] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setEvents([]);
      setFilterCol(null);

      try {
        if (!allianceCode) throw new Error("Missing alliance code.");

        // Attempt 1: alliance_events with alliance_code
        const resA = await supabase
          .from("alliance_events")
          .select("*")
          .eq("alliance_code", allianceCode)
          .order("start_at", { ascending: true });

        if (!resA.error) {
          if (!cancelled) {
            setEvents((resA.data ?? []) as AnyRow[]);
            setFilterCol("alliance_code");
            setLoading(false);
          }
          return;
        }

        const msg = String(resA.error.message ?? "").toLowerCase();

        // Attempt 2: alliance_events with alliance_id (text code)
        if (msg.includes("alliance_code")) {
          const resB = await supabase
            .from("alliance_events")
            .select("*")
            .eq("alliance_id", allianceCode)
            .order("start_at", { ascending: true });

          if (resB.error) throw resB.error;

          if (!cancelled) {
            setEvents((resB.data ?? []) as AnyRow[]);
            setFilterCol("alliance_id");
            setLoading(false);
          }
          return;
        }

        // If the error wasn't about alliance_code, surface it
        throw resA.error;
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [allianceCode]);

  if (loading) return <div style={{ padding: 16 }}>Loading Calendar…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📅 Calendar (View Only) — {allianceCode}</h2>
        <Link to={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ opacity: 0.85 }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        This is a read-only view page (Option 1 UI-only). Owners/R4/R5 should use the normal Calendar page.
      </div>

      {filterCol ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
          Filtering by: <b>{filterCol}</b>
        </div>
      ) : null}

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {events.length === 0 ? (
        <div style={{ marginTop: 12, opacity: 0.75 }}>No events found.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {events.map((e, i) => {
            const id = String(e?.id ?? `evt_${i}`);
            const title = pickTitle(e);
            const when = pickWhen(e);
            const body = String(e?.body ?? e?.description ?? e?.notes ?? "");

            return (
              <div key={id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>{title}</div>
                {when ? <div style={{ opacity: 0.8, marginTop: 4 }}>{when}</div> : null}
                {body ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.9 }}>{body}</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
