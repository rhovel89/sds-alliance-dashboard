import React from "react";
import { useParams } from "react-router-dom";
import State789DiscussionDbPage from "./State789DiscussionDbPage";

export default function StateDiscussionDbPage() {
  const { state_code } = useParams();
  const sc = String(state_code ?? "789");

  if (sc !== "789") {
    return (
      <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>State {sc} Discussion (DB)</h1>
        <div style={{ opacity: 0.8, marginTop: 8 }}>
          Multi-state route is ready. Next step is to param-ize the discussion page to use <code>state_code</code>.
        </div>
        <div style={{ opacity: 0.7, marginTop: 12 }}>
          For now, State 789 continues to use the existing working page.
        </div>
      </div>
    );
  }

  return <State789DiscussionDbPage />;
}
