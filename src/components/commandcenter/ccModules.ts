export type CCModule = {
  key: string;
  label: string;
  hint?: string;
  to: string;
};

/**
 * Command Center module registry.
 * NOTE: UI hints only; Supabase RLS enforces permissions.
 */
export function getCommandCenterModules(): CCModule[] {
  return [
    // Identity
    { key: "dossier", label: "Dossier", hint: "Identity + defaults", to: "/me/dossier" },

    // Dashboards
    { key: "dash", label: "Dashboard", hint: "My dashboards hub", to: "/dashboard" },
    { key: "alliance", label: "Alliance Ops", hint: "/dashboard/<ALLIANCE>", to: "/dashboard" },

    // State 789 (primary war room)
    { key: "state789", label: "State 789", hint: "War room hub", to: "/state/789" },
    { key: "threads789", label: "Threads", hint: "In-app threads + Discord", to: "/state/789/threads" },
    { key: "ach789", label: "Achievements", hint: "Dossier + exports", to: "/state/789/achievements" },

    // Owner Ops
    { key: "owner", label: "Owner", hint: "Owner command center", to: "/owner" },
    { key: "approve", label: "Approval Center", hint: "Approve + assign", to: "/owner/approval-center" },
    { key: "achInbox", label: "Achievement Inbox", hint: "Review requests", to: "/owner/state-achievement-inbox" },
    { key: "achAdmin", label: "State Achievements", hint: "Admin + catalog", to: "/owner/state-achievements" },
  ];
}
