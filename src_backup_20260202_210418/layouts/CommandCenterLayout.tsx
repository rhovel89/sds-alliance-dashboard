import { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function CommandCenterLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f0e", color: "#e5e7eb" }}>
      <header style={{ padding: 16, borderBottom: "1px solid #1f2933" }}>
        <strong>🧟 State 789 Alliance Command</strong>
        <nav style={{ marginTop: 8 }}>
          <Link to="/" style={{ marginRight: 12 }}>My Alliance</Link>
          <Link to="/permissions">Permissions</Link>
        </nav>
      </header>
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}

