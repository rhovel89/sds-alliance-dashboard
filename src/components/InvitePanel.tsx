import { useParams } from "react-router-dom";
import { useState } from 'react';
import { createInvite, revokeInvite } from '../services/invites';

export default function InvitePanel({ allianceId, canInvite }) {
  const { allianceId } = useParams<{ allianceId: string }>();
  const [token, setToken] = useState(null);

  if (!canInvite) return null;

  return (
    <div>
      <button onClick={async () => setToken(await createInvite(allianceId))}>
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
