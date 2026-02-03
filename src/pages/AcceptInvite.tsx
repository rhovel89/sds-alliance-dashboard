import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function AcceptInvite() {
  const { token } = useParams();
  const { session } = useAuth();

  async function accept() {
    await supabase.rpc("accept_alliance_invite_token", {
      token,
      user_uuid: session?.user.id
    });
    window.location.href = "/dashboard";
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Accept Alliance Invite</h1>
      <button onClick={accept}>Accept Invite</button>
    </div>
  );
}
