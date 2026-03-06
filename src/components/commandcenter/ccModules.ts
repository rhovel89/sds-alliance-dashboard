export type CommandCenterNavItem = {
  key: string;
  label: string;
  hint?: string;
  to: string;
};

export function getCommandCenterModules(): CommandCenterNavItem[] {
  return [
    { key: "dash", label: "Dashboard", hint: "Alliances + quick links", to: "/dashboard" },
    { key: "state789", label: "State 789", hint: "War room hub", to: "/state/789" },
    { key: "ach789", label: "Achievements", hint: "Dossier + exports", to: "/state/789/achievements" },
    { key: "opsPlayers", label: "Player Ops", hint: "Intake + approvals", to: "/owner/player-ops" },
    { key: "opsAlliances", label: "Alliance Ops", hint: "Roles + setup", to: "/owner/alliance-ops" },
    { key: "me", label: "My Profile", hint: "Your intel", to: "/me" },
  ];
}



