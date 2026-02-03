import { ALLIANCE_ROLES } from '../constants/roles';

export default function RoleEditor() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Alliance Roles</h2>

      {ALLIANCE_ROLES.map(role => (
        <div key={role.key} style={{ marginBottom: 8 }}>
          <strong>{role.key}</strong> — Rank {role.rank}
          {role.locked && <em> (Locked)</em>}
        </div>
      ))}

      <p style={{ marginTop: 20 }}>
        Custom role editing will be enabled here.
      </p>
    </div>
  );
}
