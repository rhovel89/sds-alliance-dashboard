import React from "react";
import { useParams } from "react-router-dom";
import State789DiscussionDbPage from "./State789DiscussionDbPage";

export default function StateDiscussionDbPage() {
  const { state_code } = useParams();
  if (state_code && state_code !== "789") {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontWeight: 900 }}>State {state_code} Discussion (DB)</h1>
        <div style={{ opacity: 0.8 }}>
          Multi-state route is ready. Next step is param-izing the discussion page to use state_code.
        </div>
      </div>
    );
  }
  return <State789DiscussionDbPage />;
}
