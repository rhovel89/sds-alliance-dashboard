import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAllianceRoles } from "../../hooks/useAllianceRoles";
import { useMyAllianceContext } from "../../contexts/AllianceContext";
import { supabase } from "../../lib/supabaseClient";

export default function AllianceRoleManager() {
  const { allianceId } = useParams<{ alliance_id: string }>();
  const { allianceId } = useMyAllianceContext();
  const { roles, addRole, updateRole, deleteRole } = useAllianceRoles(allianceId);
  const [name, setName] = useState("");
  const [rank, setRank] = useState(1);

  async function handleDelete(roleId: string, roleName: string) {
    // Downgrade members FIRST
    await supabase
      .from("alliance_members")
      .update({ role: "Member" })
      .eq("role", roleName)
      .eq("alliance_id", allianceId);

    await deleteRole(roleId);
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h2>Manage Alliance Roles</h2>

      <div>
        <input
          placeholder="Role name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          type="number"
          value={rank}
          onChange={e => setRank(Number(e.target.value))}
        />

        <button onClick={() => {
          addRole(name, rank);
          setName("");
          setRank(1);
        }}>
          Add Role
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Rank</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.rank}</td>
              <td>
                {r.name !== "Owner" && (
                  <>
                    <button onClick={() => updateRole(r.id, r.name, r.rank + 1)}>▲</button>
                    <button onClick={() => updateRole(r.id, r.name, r.rank - 1)}>▼</button>
                    <button onClick={() => handleDelete(r.id, r.name)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

