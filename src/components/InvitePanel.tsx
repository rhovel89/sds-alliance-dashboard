import { useParams } from "react-router-dom";
import { useState } from 'react';
import { createInvite, revokeInvite } from '../services/invites';

export default function InvitePanel({ alliance_id, canInvite }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [token, setToken] = useState(null);

  if (!canInvite) return null;

  return (
    <div>
      <button onClick={async () => setToken(await createInvite(alliance_id))}>
        Generate Invite
      </button>

      {token && (
        <div>
          <code>{window.location.origin}/invite/{token}</code>
          <button onClick={() => revokeInvite(token)}>Revoke</button>
        </div>
      )}
    </div>
  );
}
