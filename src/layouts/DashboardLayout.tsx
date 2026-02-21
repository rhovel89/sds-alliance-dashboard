import React from "react";
import { Outlet } from "react-router-dom";
import AuthRedirector from "../components/auth/AuthRedirector";

type Props = { children?: React.ReactNode };

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="dashboard-layout">
      {/* Keeps session flow consistent (was used throughout the app) */}
      <AuthRedirector />

      {/* Restores ALL top-level UI controls (Admin Tools, badge, theme, etc) */}

      <main className="dashboard-main">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
