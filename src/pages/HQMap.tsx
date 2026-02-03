export default function HQMap() {
  return (
    <div className='page' className="page">
      <h1>SDS HQ Map</h1>
      <div className='page' style={{
        display: "grid",
        gridTemplateColumns: "repeat(16, 1fr)",
        gap: "4px",
        maxWidth: "100%",
        background: "#111",
        padding: "12px",
        border: "1px solid #1f3d00"
      }}>
        {Array.from({ length: 256 }).map((_, i) => (
          <div className='page' key={i} style={{
            height: 50,
            background: "#0b0b0b",
            border: "1px solid #222"
          }} />
        ))}
      </div>
    </div>
  );
}


