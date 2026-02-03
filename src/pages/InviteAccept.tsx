import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function InviteAccept() {
  const { token } = useParams();
  const { session } = useAuth();

  async function acceptInvite() {
    if (!session) return alert("Login required");

    const { data, error } = await supabase
      .from("alliance_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) return alert("Invalid invite");

    await supabase.from("alliance_members").insert({
      user_id: session.user.id,
      alliance_id: data.alliance_id,
      state_id: data.state_id,
      role: data.role
    });

    await supabase
      .from("alliance_invites")
      .update({ used_at: new Date(), used_by: session.user.id })
      .eq("id", data.id);

    alert("Joined alliance!");
  }

  return (
    <div className="page">
      <h1>Accept Alliance Invite</h1>
      <button onClick={acceptInvite}>Accept Invite</button>
    </div>
  );
}
