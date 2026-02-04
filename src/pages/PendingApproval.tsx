import { useEffect } from "react";
import { setPageTitle } from "../utils/pageTitle";

export default function PendingApproval() {
  useEffect(() => {
    setPageTitle("Pending Approval");
  }, []);

  return (
    <>
      <div className="auth-title">Approval Pending</div>
      <div className="auth-subtitle">
        An alliance owner or moderator must approve your access.
      </div>

      <p style={{ fontSize: "14px", color: "#9aa4b2" }}>
        You will gain access automatically once approved.
      </p>
    </>
  );
}
