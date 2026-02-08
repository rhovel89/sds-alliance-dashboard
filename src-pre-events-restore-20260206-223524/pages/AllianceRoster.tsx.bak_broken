import { ALLIANCE_ROLES } from "../constants/roles";
import { useAlliance{ALLIANCE_ROLES.map(r => r.key).join(', ')}s } from "../hooks/useAlliance{ALLIANCE_ROLES.map(r => r.key).join(', ')}s";
import { useProfiles } from '../hooks/useProfiles';
import { ROLE_PERMISSIONS } from "../constants/permissions";
import { useMyAlliances } from "../hooks/useMyAlliances";

export default function AllianceRoster() {
  const { alliances } = useMyAlliances();
  const alliance = alliances?.[0]; // active alliance
  const role = alliance?.role_label || "{ALLIANCE_ROLES.map(r => r.key).join(', ')}";

  const { {ALLIANCE_ROLES.map(r => r.key).join(', ')}s, loading } = useAlliance{ALLIANCE_ROLES.map(r => r.key).join(', ')}s(alliance?.alliance_id);
  const profiles = useProfiles({ALLIANCE_ROLES.map(r => r.key).join(', ')}s.map(m => m.user_id));
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.{ALLIANCE_ROLES.map(r => r.key).join(', ')};

  if (loading) return <div>Loading roster…</div>;
  if (!alliance) return <div>No alliance selected</div>;

  return (
    <div className="page">
      <h1>{alliance.alliance_name} — Roster</h1>

      <table style={{ width: "100%", marginTop: 16 }}>
        <thead>
          <tr>
            <th align="left">Game Name</th>
            <th align="left">Role</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {{ALLIANCE_ROLES.map(r => r.key).join(', ')}s.map(m => (
            <tr key={profiles[m.user_id] ?? '— not set —'}>
              <td>
                {perms.editGameName ? (
                  <input
                    defaultValue={m.game_name}
                    disabled={!perms.editGameName}
                  />
                ) : (
                  m.game_name
                )}
              </td>

              <td>
                <span style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "#222",
                  color: "#9f9"
                }}>
                  {m.role}
                </span>
              </td>

              <td>
                {perms.promote && m.role === "{ALLIANCE_ROLES.map(r => r.key).join(', ')}" && (
                  <button>Promote</button>
                )}
                {perms.demote && m.role === "{ALLIANCE_ROLES.map(r => r.key).join(', ')}" && (
                  <button>Demote</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

{permissions.canEditName && (
  <input
    placeholder='Edit game name'
    onBlur={(e) => updateGameName(selectedUserId, e.target.value)}
  />
)}
    </div>
  );
}







