import { useParams } from "react-router-dom";
import { ALLIANCE_ROLES } from '../constants/roles';
import { changeMemberRole } from '../services/roles';

export default function RoleSelector({ alliance_id, member, canManage }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  if (!canManage || member.role === 'Owner') return <span>{member.role}</span>;

  return (
    <select
      value={member.role}
      onChange={e =>
        changeMemberRole(alliance_id, member.user_id, e.target.value)
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
