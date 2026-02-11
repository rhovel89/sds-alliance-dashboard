import { useState } from "react";
import { useAlliance } from "../contexts/AllianceContext";

type Role =
  | "Owner"
  | "Dashboard Mod"
  | "Dashboard Assist"
  | "R5"
  | "R4"
  | "Member"
  | "State Leadership"
  | "State Mod"
  | "State Member";

type UserRow = {
  id: string;
  gameName: string;
  role: Role;
};

const MOCK_USERS: UserRow[] = [
  { id: "1", gameName: "PlayerOne", role: "Member" },
  { id: "2", gameName: "PlayerTwo", role: "R4" },
  { id: "3", gameName: "StateLead", role: "State Leadership" },
];

export default function Permissions() {
  const { activeAlliance } = useAlliance();
  const [users, setUsers] = useState<UserRow[]>(MOCK_USERS);

  function updateRole(userId: string, role: Role) {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role } : u))
    );
  }

  return (
    <div className='page'>
      <h1>Permissions</h1>

      <p style={{ opacity: 0.7 }}>
        Alliance: {activeAlliance?.name ?? "No alliance selected"}
      </p>

      <table style={{ width: "100%", marginTop: 16 }}>
        <thead>
          <tr>
            <th align="left">Player</th>
            <th align="left">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.gameName}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value as Role)}
                >
                  <option>Owner</option>
                  <option>Dashboard Mod</option>
                  <option>Dashboard Assist</option>
                  <option>R5</option>
                  <option>R4</option>
                  <option>Member</option>
                  <option>State Leadership</option>
                  <option>State Mod</option>
                  <option>State Member</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



