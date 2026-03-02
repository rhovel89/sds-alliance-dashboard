import React from "react";
import PlayerMeProfileAndHqsPanel from "../player/PlayerMeProfileAndHqsPanel";

/**
 * Compatibility wrapper.
 * MyProfile.tsx expects: ../components/profile/PlayerProfileEditor
 * We forward to the current profile panel implementation.
 */
export default function PlayerProfileEditor(props: any) {
  return <PlayerMeProfileAndHqsPanel {...props} />;
}
