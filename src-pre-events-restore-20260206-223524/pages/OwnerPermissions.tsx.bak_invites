import { useMyAlliances } from "../hooks/useMyAlliances";
import { useAllianceMembers } from "../hooks/useAllianceMembers";
import { supabase } from "../lib/supabaseClient";

const ROLES = ["Owner", "Mod", "Member"];

export default function OwnerPermissions() {
  const { alliances, loading } = useMyAlliances();

  const ownerAlliance =
    alliances?.find(a => a.role_label === "Owner") ?? null;

  const { members, loading: membersLoading } =
    useAllianceMembers(ownerAlliance?.alliance_id);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (!ownerAlliance) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Access denied</h2>
        <p>Only alliance owners can manage permissions.</p>
      </div>
    );
  }

  async function updateRole(memberId: string, newRole: string) {
    const { error } = await supabase
      .from("alliance_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Owner Permissions</h1>
      <p>
        Managing alliance: <strong>{ownerAlliance.alliance_name}</strong>
      </p>

      <h3 style={{ marginTop: 24 }}>Members</h3>

      {membersLoading && <p>Loading members…</p>}

      {!membersLoading && members.length === 0 && (
        <p>No members found.</p>
      )}

      {!membersLoading && members.length > 0 && (
        <table border={1} cellPadding={8} style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>In-Game Name</th>
              <th>Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>{m.in_game_name || "—"}</td>
                <td>{m.role}</td>
                <td>
                  <select
                    value={m.role}
                    onChange={e => updateRole(m.id, e.target.value)}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
