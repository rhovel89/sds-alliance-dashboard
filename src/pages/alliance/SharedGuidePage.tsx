import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import supabase from "../../lib/supabaseClient";

type SharedPayload = {
  ok: boolean;
  error?: string;
  target_type?: "section" | "entry";
  alliance_code?: string;
  section?: any;
  entry?: any;
  entries?: any[];
};

export default function SharedGuidePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<SharedPayload | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      const res = await supabase.rpc("get_shared_guide", { p_token: token });

      if (!alive) return;

      if (res.error) {
        setErr(res.error.message || "Could not load shared guide.");
        setLoading(false);
        return;
      }

      setPayload((res.data ?? null) as SharedPayload);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>Loading shared guide…</div>;
  }

  if (err) {
    return <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>Error: {err}</div>;
  }

  if (!payload?.ok) {
    return <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>This shared link is invalid, revoked, or expired.</div>;
  }

  if (payload.target_type === "section") {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
        <div
          className="zombie-card"
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ opacity: 0.7, fontSize: 12 }}>Shared guide section</div>
          <h1 style={{ marginBottom: 8 }}>{payload.section?.title || "Shared Section"}</h1>
          {payload.section?.description ? (
            <div style={{ whiteSpace: "pre-wrap", opacity: 0.88 }}>{payload.section.description}</div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {(payload.entries ?? []).map((entry: any) => (
            <article
              key={entry.id}
              className="zombie-card"
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>{entry.title}</h2>
              <div style={{ whiteSpace: "pre-wrap" }}>{entry.body}</div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ opacity: 0.7, fontSize: 12 }}>Shared guide page</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
          {payload.section?.title || "Guide"}
        </div>
        <h1 style={{ marginBottom: 10 }}>{payload.entry?.title || "Shared Page"}</h1>
        <div style={{ whiteSpace: "pre-wrap" }}>{payload.entry?.body}</div>
      </div>
    </div>
  );
}