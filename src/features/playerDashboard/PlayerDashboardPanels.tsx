import { PlayerAnnouncementsPanel } from "./PlayerAnnouncementsPanel";
import { PlayerGuidesPanel } from "./PlayerGuidesPanel";
import { PlayerHqsPanel } from "./PlayerHqsPanel";
import { PlayerHqDetailsPanel } from "./PlayerHqDetailsPanel";

export function PlayerDashboardPanels(props: { targetPlayerId?: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <PlayerAnnouncementsPanel targetPlayerId={props.targetPlayerId} />
      <PlayerGuidesPanel targetPlayerId={props.targetPlayerId} />
      <PlayerHqsPanel targetPlayerId={props.targetPlayerId} />
      <PlayerHqDetailsPanel targetPlayerId={props.targetPlayerId} />
    </div>
  );
}
