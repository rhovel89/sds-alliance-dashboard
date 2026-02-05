import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function MyInvites() {
  const { session } = useAuth();
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("alliance_invites")
      .select("*")
      .eq("invited_email", session.user.email)
      .eq("status", "pending")
      .then(res => setInvites(res.data || []));
  }, [session]);

  async function acceptInvite(id: string) {
    await supabase.rpc("accept_alliance_invite", {
      invite_id: id,
      user_uuid: session?.user.id
    });
    setInvites(invites.filter(i => i.id !== id));
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Invites</h1>

      {invites.length === 0 && <p>No pending invites.</p>}

      {invites.map(i => (
        <div key={i.id} style={{ marginBottom: 12 }}>
          <strong>{i.alliance_id}</strong> — role: {i.role}
          <button onClick={() => acceptInvite(i.id)} style={{ marginLeft: 8 }}>
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}

