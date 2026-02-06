import { rolePermissions } from '../constants/permissions';
import { useMyAlliances } from './useMyAlliances';

export function useAlliancePermissions() {
  const { alliances } = useMyAlliances();
  const role = alliances?.[0]?.role_label ?? 'Member';
  return rolePermissions(role);
}
