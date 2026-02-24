import React from "react";

function Card(props: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      <div style={{ marginTop: 10 }}>{props.children}</div>
      {props.note ? <div style={{ opacity: 0.65, fontSize: 12, marginTop: 8 }}>{props.note}</div> : null}
    </div>
  );
}

export default function MeQuickPanels() {
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <Card title="Quick Links" note="These are safe navigation links (no DB coupling).">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/mail-threads">Mail Threads</a>
          <a href="/mail-v2">Mail Inbox</a>
          <a href="/me/hq-manager">HQ Manager</a>
          <a href="/state/789/achievements/request-v2">Request Achievement</a>
          <a href="/state/789/achievements/admin-v2">Achievements Admin</a>
          <a href="/state/789/alerts-db">State Alerts</a>
          <a href="/state/789/discussion-db">State Discussion</a>
        </div>
      </Card>

      <Card title="Today" note="(Next: we can wire actual 'events today' into /me once you confirm which calendar view to use.)">
        <div style={{ opacity: 0.8 }}>
          Use the alliance calendar tab in your alliance dashboard for now. We can add a dedicated “Today’s Events” feed later.
        </div>
      </Card>

      <Card title="Profile Tips" note="(Optional) Add your HQs + primary HQ to make alliance planning easier.">
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
          <li>Keep your HQ levels + lair progress updated</li>
          <li>Mark one HQ as Primary for quick reference</li>
          <li>Use Mail Threads for fast DM coordination</li>
        </ul>
      </Card>
    </div>
  );
}
