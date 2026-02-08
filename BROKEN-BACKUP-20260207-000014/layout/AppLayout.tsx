import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/layout.css";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <span className="logo">STATE 789</span>
          <div className="header-actions">
            {/* reserved for future user/menu */}
          </div>
        </div>
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <span>© {new Date().getFullYear()} State 789 Alliance Dashboard</span>
      </footer>
    </div>
  );
}
