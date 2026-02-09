import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AcceptInvite() {
  const { token } = useParams();

  async function accept() {
    const { data: invite } = await supabase
      .from("alliance_invites")
      .select("*")
      .eq("token", token)
      .eq("revoked", false)
      .maybeSingle();

    if (!invite) return alert("Invalid invite");

    await supabase.from("alliance_members").insert({
      alliance_id: invite.alliance_id,
      role: invite.role,
    });

    alert("Joined alliance!");
  }

  return (
    <div>
      <h1>Accept Alliance Invite</h1>
      <button onClick={accept}>Join Alliance</button>
    </div>
  );
}

