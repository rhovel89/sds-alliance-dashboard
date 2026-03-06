import "./styles/cc-global.css";
import "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import GlobalErrorOverlay from "./components/system/GlobalErrorOverlay";
import AppErrorBoundary from "./components/system/AppErrorBoundary";

import "./index.css";
import "./styles/zombie-theme.css";
import "./styles/zombie-base.css";
import "./styles/zombie-animations.css";
import "./styles/zombie-effects.css";
import "./styles/zombie-blood.css";
import "./styles/sidebar.css";
import "./styles/dashboard-zombie.css";
import "./styles/command-center.css";
import "./styles/hq-map.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <BrowserRouter basename="/">
        <>
          <GlobalErrorOverlay />
          <App />
        </>
      </BrowserRouter>
    </React.StrictMode>
  </AppErrorBoundary>
);


