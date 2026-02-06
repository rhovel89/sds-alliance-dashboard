import "../styles/hq-map-zombie.css";

export default function HQMap() {
    return (
    <div className="hq-map-page">
      <h2 className="hq-map-title">🧟 Alliance HQ Map</h2>

      <div className="hq-map-grid">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="hq-cell">
            HQ {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

