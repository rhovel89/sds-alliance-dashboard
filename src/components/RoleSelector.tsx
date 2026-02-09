import { useParams } from "react-router-dom";
import { ALLIANCE_ROLES } from '../constants/roles';
import { changeMemberRole } from '../services/roles';

export default function RoleSelector({ allianceId, member, canManage }) {
  const { allianceId } = useParams<{ alliance_id: string }>();
  if (!canManage || member.role === 'Owner') return <span>{member.role}</span>;

  return (
    <select
      value={member.role}
      onChange={e =>
        changeMemberRole(allianceId, member.user_id, e.target.value)
      }
    >
      {ALLIANCE_ROLES.filter(r => !r.locked).map(r => (
        <option key={r.key} value={r.key}>
          {r.key}
        </option>
      ))}
    </select>
  );
}
