export type NavItem = {
  key: string;
  label: string;
  to: string;
  hint?: string;
  group?: string;
  icon?: string;
};

export type SidebarTab = {
  key: string;
  label: string;
  to: string;
  icon?: string;
};

export function getAllianceSidebarTabs(base: string): SidebarTab[] {
  const b = String(base || "");
  return [
    { key: "overview", label: "Overview", to: b || "/dashboard", icon: "🧭" },
    { key: "calendar", label: "Calendar", to: `${b}/calendar`, icon: "📅" },
    { key: "hq", label: "HQ Map", to: `${b}/hq-map`, icon: "🗺️" },
    { key: "ann", label: "Announcements", to: `${b}/announcements`, icon: "📢" },
    { key: "guides", label: "Guides", to: `${b}/guides`, icon: "📚" },
    { key: "profile", label: "My Profile", to: `${b}/profile`, icon: "🧍" },
  ];
}

export function getCommandPaletteItems(): NavItem[] {
  // Keep this list stable and global; it should NOT require alliance params.
  return [
    { key: "dash", label: "Dashboard", to: "/dashboard", group: "Core", hint: "Alliance selection + quick links" },
    { key: "me", label: "My Dossier", to: "/me", group: "Core", hint: "Your profile + intel" },

    { key: "state789", label: "State 789 — War Room", to: "/state/789", group: "State 789", hint: "Primary hub" },
    { key: "ach789", label: "State 789 — Achievements", to: "/state/789/achievements", group: "State 789", hint: "Dossier + export" },
    { key: "threads789", label: "State 789 — Threads", to: "/state/789/threads", group: "State 789", hint: "Ops comms + Discord notify" },

    { key: "owner", label: "Owner Command", to: "/owner", group: "Owner", hint: "Owner home" },
    { key: "ops", label: "Ops Console", to: "/owner/ops", group: "Owner", hint: "Unified ops hub" },
    { key: "authority", label: "Authority Console", to: "/owner/authority", group: "Owner", hint: "RLS + identity truth" },
    { key: "playerops", label: "Player Ops", to: "/owner/player-ops", group: "Owner", hint: "Intake + approvals" },
    { key: "allianceops", label: "Alliance Ops", to: "/owner/alliance-ops", group: "Owner", hint: "Roles + setup" },
    { key: "access", label: "Access Control", to: "/owner/access-control", group: "Owner", hint: "Permissions + RLS alignment" },
  ];
}
