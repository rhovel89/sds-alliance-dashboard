import { useEffect, useState } from "react";
import { useInvitePermissions } from "../../hooks/useInvitePermissions";

const ROLES = ["Owner", "Admin", "Moderator"];

export default function InvitePermissions({ allianceId }: { allianceId: string }) {
  const { getPermissions, setPermission } = useInvitePermissions(allianceId);
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

