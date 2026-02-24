import React from "react";
import { useParams } from "react-router-dom";
import State789AlertsDbPage from "./State789AlertsDbPage";

export default function StateAlertsDbPage() {
  // For now reuse the working 789 page; later we’ll param-ize it.
  // This is "prep": route exists, logic stays stable.
  const { state_code } = useParams();
  if (state_code && state_code !== "789") {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontWeight: 900 }}>State {state_code} Alerts (DB)</h1>
        <div style={{ opacity: 0.8 }}>
          Multi-state route is ready. Next step is param-izing the alerts page to use state_code.
        </div>
      </div>
    );
  }
  return <State789AlertsDbPage />;
}
