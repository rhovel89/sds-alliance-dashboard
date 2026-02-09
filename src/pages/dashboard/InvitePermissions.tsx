import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useInvitePermissions } from "../../hooks/useInvitePermissions";

const ROLES = ["Owner", "Admin", "Moderator"];

export default function InvitePermissions({ alliance_id }: { alliance_id: string }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const { getPermissions, setPermission } = useInvitePermissions(alliance_id);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    getPermissions().then(setRows);
  }, []);

  return (
    <div>
      <h2>Invite Permissions</h2>
      {ROLES.map(role => {
        const row = rows.find(r => r.role === role);
        return (
          <label key={role} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={row?.can_invite || false}
              onChange={e => setPermission(role, e.target.checked)}
            />
            {role}
          </label>
        );
      })}
    </div>
  );
}

