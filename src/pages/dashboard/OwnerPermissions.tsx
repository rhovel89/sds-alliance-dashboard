import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAllianceRoles } from "../../hooks/useAllianceRoles";
import { useMyAllianceContext } from "../../contexts/AllianceContext";

export default function OwnerPermissions() {
  const { allianceId } = useParams<{ alliance_id: string }>();
  const { allianceId, allianceName } = useMyAllianceContext();
  const { roles } = useAllianceRoles(allianceId);
  const [inviteRole, setInviteRole] = useState("Member");
  const [email, setEmail] = useState("");

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Owner Permissions</h1>
      <p>Managing: <strong>{allianceName}</strong></p>

      <h2>Invite User</h2>

      <input
        placeholder="User email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <select
        value={inviteRole}
        onChange={e => setInviteRole(e.target.value)}
      >
        {roles.map(r => (
          <option key={r.id} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      <button>Send Invite</button>
    </div>
  );
}

import AllianceRoleManager from "../../components/roles/AllianceRoleManager";

<AllianceRoleManager />

import { nanoid } from "nanoid";

async function sendInvite(email: string, role: string, alliance_id: string) {
  const token = nanoid(32);

  await supabase.from("alliance_invites").insert({
    email,
    role,
    alliance_id: allianceId,
    token
  });

  alert("Invite sent!");
}

<button onClick={() => sendInvite(email, inviteRole, allianceId)}>
  Send Invite
</button>

async function revokeInvite(id: string) {
  await supabase
    .from("alliance_invites")
    .update({ revoked: true })
    .eq("id", id);
}

