import "./styles/global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { AllianceProvider } from "./contexts/AllianceContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { StateProvider } from "./contexts/StateContext";
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AllianceProvider>
            <PermissionProvider>
              <StateProvider>
                <App />
              </StateProvider>
            </PermissionProvider>
          </AllianceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

