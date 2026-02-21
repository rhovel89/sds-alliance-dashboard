import React from "react";
import { Outlet } from "react-router-dom";

type Props = { children?: React.ReactNode };

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}