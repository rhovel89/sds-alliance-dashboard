import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import AuthGate from "./components/AuthGate";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <AppRoutes />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
