import { ROLE_PERMISSIONS } from '../constants/permissions';
import { useMyAlliances } from './useMyAlliances';

export function usePermissions() {
  const { alliances } = useMyAlliances();

  const role = alliances?.[0]?.role_label || 'Member';

  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Member;
}
