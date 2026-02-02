import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";

import LandingPage from "../pages/LandingPage";
import MyAlliance from "../pages/MyAlliance";
import Onboarding from "../pages/Onboarding";
import PendingApproval from "../pages/PendingApproval";
import OwnerOnboarding from "../pages/OwnerOnboarding";
import PermissionsAdmin from "../pages/PermissionsAdmin";

type OnboardStatus = "none" | "pending" | "approved";

export default function AppRoutes() {
  const { session, loading } = useAuth();
  const [onboardStatus, setOnboardStatus] = useState<OnboardStatus>("none");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!session) {
      setChecked(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("onboarding_requests")
        .select("status")
        .eq("user_id", session.user.id)
        .limit(1);

      if (error) {
        console.warn(
          "[onboarding] query failed — defaulting to none",
          error.message
        );
        setOnboardStatus("none");
        setChecked(true);
        return;
      }

      if (!data || data.length === 0) {
        setOnboardStatus("none");
      } else {
        setOnboardStatus(data[0].status ?? "none");
      }

      setChecked(true);
    })();
  }, [session]);

  if (loading || !checked) {
    return <div style={{ color: "#9f9" }}>Loading…</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (onboardStatus === "none") {
    return <Onboarding />;
  }

  if (onboardStatus === "pending") {
    return <PendingApproval />;
  }

  return (
    <Routes>
      <Route path="/" element={<MyAlliance />} />
      <Route path="/owner/onboarding" element={<OwnerOnboarding />} />
      <Route path="/owner/permissions" element={<PermissionsAdmin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
