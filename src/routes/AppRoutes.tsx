import { Routes, Route } from "react-router-dom";
import LoginTransition from "../components/LoginTransition";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <LoginTransition>
            <div style={{
              minHeight: "100vh",
              background: "black",
              color: "lime",
              padding: "40px",
              fontSize: "24px",
              fontFamily: "monospace"
            }}>
              🧪 ROUTER-LEVEL DASHBOARD RENDER
            </div>
          </LoginTransition>
        }
      />

      <Route path="*" element={<div>Fallback Route</div>} />
    </Routes>
  );
}
