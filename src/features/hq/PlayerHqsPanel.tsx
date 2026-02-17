import HQCard from "./HQCard";
import { usePlayerHQs } from "./usePlayerHQs";

export function PlayerHqsPanel() {
  const { loading, error, hqs, alliances } = usePlayerHQs();

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🏰 Your HQs</h3>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Private to you (Owner access later if needed)
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 10, opacity: 0.8 }}>Loading your HQs…</div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      {!loading && !error && (!hqs || hqs.length === 0) ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          No HQs found yet for your account.
        </div>
      ) : null}

      {!loading && !error && hqs && hqs.length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {hqs.map(hq => (
            <HQCard
              key={hq.id}
              hq={hq}
              allianceName={alliances[String(hq.allianceCode || "").toUpperCase()]?.name ?? null}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
