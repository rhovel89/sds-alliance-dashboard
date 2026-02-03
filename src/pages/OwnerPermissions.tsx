import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useMyAlliances } from "../hooks/useMyAlliances";
import { useAllianceMembers } from "../hooks/useAllianceMembers";

export default function OwnerPermissions() {
  const { alliances } = useMyAlliances();
  const ownerAlliance = alliances?.find(a => a.role_label === "Owner") ?? null;
  const { members } = useAllianceMembers(ownerAlliance?.alliance_id);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [status, setStatus] = useState("");

  async function sendInvite() {
    if (!ownerAlliance || !email) return;

    const { error } = await supabase
      .from("alliance_invites")
      .insert({
        alliance_id: ownerAlliance.alliance_id,
        invited_email: email,
        role
      });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Invite sent!");
      setEmail("");
    }
  }

  if (!ownerAlliance) {
    return <div style={{ padding: 24 }}>Access denied</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Owner Permissions</h1>
      <p>Managing: <strong>{ownerAlliance.alliance_name}</strong></p>

      <h3>Invite User</h3>

      <input
        placeholder="User email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ marginRight: 8 }}
      />

      <select value={role} onChange={e => setRole(e.target.value)}>
        <option>Member</option>
        <option>Mod</option>
      </select>

      <button onClick={sendInvite} style={{ marginLeft: 8 }}>
        Send Invite
      </button>

      {status && <p>{status}</p>}

      <h3 style={{ marginTop: 32 }}>Members</h3>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>In-Game Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td>{m.in_game_name || "—"}</td>
              <td>{m.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
