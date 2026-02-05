import { useEffect, useState } from "react";
import LoginTransition from "../components/LoginTransition";

export default function AllianceDashboard() {
  const [showTransition, setShowTransition] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowTransition(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showTransition && <LoginTransition />}

      <div style={{ padding: "2rem", color: "#ddd" }}>
        <h1>Alliance Dashboard</h1>
        <p>Survivors connected.</p>
      </div>
    </>
  );
}
