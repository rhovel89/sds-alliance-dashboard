import { supabase } from "../../lib/supabaseClient";
import { useAllianceMembers } from "../../hooks/useAllianceMembers";
import { useMyRole } from "../../hooks/useMyRole";

export default function AllianceRoster() {
  const { members } = useAllianceMembers();
  const { role: myRole } = useMyRole();
  const permissions = usePermissions();

  async function changeRole(userId: string, newRole: string) {
    if (myRole !== "Owner" && newRole === "R5") return;

    await supabase
      .from("alliance_members")
      .update({ role: newRole })
      .eq("user_id", userId);
  }

  return (
    <div>
      <h1>Alliance Roster</h1>

      <table>
        <thead>
          <tr>
            <th>In-Game Name</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.user_id}>
              <td>{m.game_name ?? "—"}</td>
              <td>{m.role}</td>
              <td>
                {(permissions.canManageRoles || permissions.canEditName) && (
                  <>
                    <button onClick={() => changeRole(m.user_id, "Member")}>⬇</button>
                    <button onClick={() => changeRole(m.user_id, "R4")}>⬆</button>
                  </>
                )}

                {permissions.canManageRoles && (
                  <button onClick={() => changeRole(m.user_id, "R5")}>⭐</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function updateGameName(userId: string, name: string) {
  await supabase
    .from("profiles")
    .upsert({ user_id: userId, game_name: name });
}

{(permissions.canManageRoles || permissions.canEditName) ? (
  <input
    defaultValue={m.game_name}
    onBlur={e => updateGameName(m.user_id, e.target.value)}
  />
) : (
  m.game_name ?? "—"
)}


async function logRoleChange(userId, oldRole, newRole) {
  await supabase.from("alliance_role_audit").insert({
    alliance_id: allianceId,
    target_user: userId,
    old_role: oldRole,
    new_role: newRole,
  });
}

