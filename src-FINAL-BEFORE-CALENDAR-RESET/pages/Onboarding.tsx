import { useEffect } from "react";
import { setPageTitle } from "../utils/pageTitle";

export default function Onboarding() {
  useEffect(() => {
    setPageTitle("Onboarding");
  }, []);

  return (
    <>
      <div className="auth-title">Alliance Onboarding</div>
      <div className="auth-subtitle">
        Complete setup to access your alliance dashboard
      </div>

      {/* EXISTING ONBOARDING FORM BELOW */}
    </>
  );
}
