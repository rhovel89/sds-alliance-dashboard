import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

export async function logAllianceActivity(args: {
  allianceId: string;
  actionType: string;
  actionLabel: string;
  metadata?: any;
}) {
  const { allianceId, actionType, actionLabel, metadata } = args;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("alliance_activity_log").insert({
    alliance_id: allianceId,
    actor_user_id: user.id,
    action_type: actionType,
    action_label: actionLabel,
    metadata: metadata ?? null
  });
}
