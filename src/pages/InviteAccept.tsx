import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('alliance_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (!data || data.used || data.revoked) {
        navigate('/login');
        return;
      }

      setInvite(data);
      setLoading(false);
    }
    load();
  }, [token]);

  async function accept() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return navigate('/login');

    // Ensure profile exists
    await supabase
      .from('profiles')
      .upsert({ user_id: user.id, game_name: 'Pending' });

    // Join alliance
    await supabase.from('alliance_members').insert({
      user_id: user.id,
      alliance_id: invite.alliance_id,
      role: invite.role,
      state_id: 789
    });

    // Mark invite used
    await supabase
      .from('alliance_invites')
      .update({ used: true, used_at: new Date() })
      .eq('id', invite.id);

    // Audit
    await supabase.from('alliance_invite_audit').insert({
      invite_id: invite.id,
      action: 'accepted',
      actor: user.id
    });

    navigate('/dashboard');
  }

  if (loading) return <div>Loading invite…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Invitation</h1>
      <p>You’ve been invited to join <b>{invite.alliance_id}</b></p>
      <button onClick={accept}>Accept Invite</button>
    </div>
  );
}
