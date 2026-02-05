import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { useSession } from "./hooks/useSession";

export default function App() {
  const { loading } = useSession();

  // 🔒 BLOCK APP UNTIL AUTH STATE IS KNOWN
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Loading session…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
