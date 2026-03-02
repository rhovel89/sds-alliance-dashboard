import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

    };
    checkSession();
  }, [navigate]);
  useEffect(() => {
    if (session) navigate("/auth/callback", { replace: true });
  }, [session, navigate]);


  return (
    <div className="panel scanner">
      <h1>🧟 State Alliance Dashboard</h1>
      <p>Survivor authentication required.</p>
      <p>Authorize to access the command bunker.</p>
    </div>
  );
}

