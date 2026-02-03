import { useState } from "react";
import { useAllianceInvites } from "../../hooks/useAllianceInvites";

export default function OwnerInvites({ allianceId }: { allianceId: string }) {
  const { createInvite, getInvites } = useAllianceInvites(allianceId);
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

