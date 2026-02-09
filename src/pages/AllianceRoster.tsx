import { useParams } from "react-router-dom";
import { useAlliancePermissions } from '../hooks/useAlliancePermissions';
import InvitePanel from '../components/InvitePanel';
import RoleSelector from '../components/RoleSelector';
import EditableGameName from '../components/EditableGameName';
import React from 'react';

import { ALLIANCE_ROLES } from '../constants/roles';
import { useAllianceMembers } from '../hooks/useAllianceMembers';
import { useMyAlliances } from '../hooks/useMyAlliances';
import { usePromoteDemote } from '../hooks/usePromoteDemote';
import { useProfiles } from '../hooks/useProfiles';
import { usePermissions } from '../hooks/usePermissions';

export default function AllianceRoster() {
  const { allianceId } = useParams<{ alliance_id: string }>();
  const { activeAllianceId } = useMyAlliances();
  const { members, loading } = useAllianceMembers(activeAllianceId);
  const { profiles } = useProfiles();
  const permissions = usePermissions();
  const { changeRole } = usePromoteDemote();

  if (!activeAllianceId) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading roster…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Alliance Roster</h2>

      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id}>
              <td>{profiles[m.user_id]?.game_name ?? m.user_id}</td>
              <td>{m.role}</td>
              <td>
                {permissions.canManageRoles && m.role !== 'Owner' && (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      changeRole(activeAllianceId, m.user_id, e.target.value)
                    }
                  >
                    {ALLIANCE_ROLES.filter(r => !r.locked).map(r => (
                      <option key={r.key} value={r.key}>
                        {r.key}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



/*
========================================
HOW YOU USE THIS (NO BREAKAGE)
========================================

Place INSIDE AllianceRoster component:

----------------------------------------
const permissions = useAlliancePermissions();

----------------------------------------
<EditableGameName
  userId={member.user_id}
  name={member.game_name}
  canEdit={permissions.canEditName}
/>

----------------------------------------
<RoleSelector
  allianceId={activeAllianceId}
  member={member}
  canManage={permissions.canManageRoles}
/>

----------------------------------------
<InvitePanel
  allianceId={activeAllianceId}
  canInvite={permissions.canInvite}
/>

----------------------------------------
NOTES:
- Owner role is always locked
- Permissions are enforced centrally
- Safe to wire gradually
========================================
*/
