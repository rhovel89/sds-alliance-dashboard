import { useMyAlliances } from "./useMyAlliances";

export function useMyRole() {
  const { alliances, loading } = useMyAlliances();

  if (loading) {
    return { role: null, loading: true };
  }

  if (!alliances || alliances.length === 0) {
    return { role: null, loading: false };
  }

  // Highest role wins
  const priority = ["Owner", "R5", "R4", "Mod", "Member"];

  const roles = alliances.map(a => a.role_label);
  const role =
    priority.find(r => roles.includes(r)) || "Member";

  return { role, loading: false };
}
