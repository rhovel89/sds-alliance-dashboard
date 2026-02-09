import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';

export function usePromoteDemote() {
  async function changeRole(
    allianceId: string,
    targetUserId: string,
    newRole: string
  ) {
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user) throw new Error('Not authenticated');

    // 1️⃣ Get current role
    const { data: current } = await supabase
      .from('alliance_members')
      .select('role')
      .eq('alliance_id', allianceId)
      .eq('user_id', targetUserId)
      .single();

    if (!current) throw new Error('Member not found');

    // 2️⃣ Update role
    const { error: updateError } = await supabase
      .from('alliance_members')
      .update({ role: newRole })
      .eq('alliance_id', allianceId)
      .eq('user_id', targetUserId);

    if (updateError) throw updateError;

    // 3️⃣ Audit log
    const { error: auditError } = await supabase
      .from('alliance_role_audit')
      .insert({
        alliance_id: allianceId,
        target_user_id: targetUserId,
        old_role: current.role,
        new_role: newRole,
        changed_by: me.user.id
      });

    if (auditError) throw auditError;
  }

  return { changeRole };
}
