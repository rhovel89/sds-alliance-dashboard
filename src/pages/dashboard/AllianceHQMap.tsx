import { useEffect, useState } from "react";

export default function AllianceHQMap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: SDS</h1>

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #00ff88",
          marginTop: 16,
        }}
      >
        <div style={{ position: "absolute", left: 405, top: 382 }}>
          <div style={{ background: "#00ff88", padding: 6 }}>
            SDS Farm HQ<br />X:405 Y:382
          </div>
        </div>

        <div style={{ position: "absolute", left: 512, top: 488 }}>
          <div style={{ background: "#00ff88", padding: 6 }}>
            Test HQ<br />X:512 Y:488
          </div>
        </div>
      </div>
    </div>
  );
}
