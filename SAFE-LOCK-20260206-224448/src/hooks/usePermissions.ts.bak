import { PERMISSIONS } from "../constants/permissions";
import { useMyRole } from "./useMyRole";

export function usePermissions() {
  const { role } = useMyRole();

  return {
    role,
    canEditName: PERMISSIONS[role]?.editName ?? false,
    canPromote: PERMISSIONS[role]?.promote ?? false,
    canManageRoles: PERMISSIONS[role]?.manageRoles ?? false,
    canInvite: PERMISSIONS[role]?.invite ?? false,
  };
}
