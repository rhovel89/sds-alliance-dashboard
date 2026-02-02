import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { AuthProvider } from "./contexts/AuthContext";
import { AllianceProvider } from "./contexts/AllianceContext";
import { StateProvider } from "./contexts/StateContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import ErrorBoundary from "./components/ErrorBoundary";

import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StateProvider>
            <AllianceProvider>
              <PermissionProvider>
                <App />
              </PermissionProvider>
            </AllianceProvider>
          </StateProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
