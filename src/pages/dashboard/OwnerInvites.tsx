import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAllianceInvites } from "../../hooks/useAllianceInvites";

export default function OwnerInvites({ alliance_id }: { alliance_id: string }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const { createInvite, getInvites } = useAllianceInvites(alliance_id);
  const [link, setLink] = useState("");

  async function handleCreate() {
    const token = await createInvite();
    setLink(`${window.location.origin}/invite/${token}`);
  }

  return (
    <div className="page">
      <h1>Alliance Invites</h1>

      <button onClick={handleCreate}>Create Invite</button>

      {link && (
        <p>
          Invite Link:<br />
          <code>{link}</code>
        </p>
      )}
    </div>
  );
}


