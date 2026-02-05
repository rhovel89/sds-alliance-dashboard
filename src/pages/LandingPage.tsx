import { useEffect } from 'react'
import '../styles/zombie-landing.css'
import { supabase } from '../lib/supabaseClient'

export default function LandingPage() {
  const { session } = useSession();
  if (session) return <Navigate to="/dashboard" replace />;
  useEffect(() => {
    document.body.classList.add('zombie-landing')
    return () => document.body.classList.remove('zombie-landing')
  }, [])

  const loginDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  return (
    <>
      <div className='blood-drip' />
      <div className='zombie-fog' />

      <div className='zombie-panel'>
        <div className='zombie-title'>STATE 789</div>

        <button className='zombie-btn' onClick={loginDiscord}>
          🧟 Login with Discord
        </button>

        <button className='zombie-btn' onClick={loginGoogle}>
          ☣️ Login with Google
        </button>
      </div>
    </>
  )
}

