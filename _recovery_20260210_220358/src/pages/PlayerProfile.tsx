import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PlayerProfile() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .maybeSingle()
      setProfile(data)
    })()
  }, [])

  if (!profile) return <div className="panel">Loading profile…</div>

  return (
    <div className="panel">
      <h2>🧍 Player Profile</h2>
      <p><strong>Name:</strong> {profile.display_name}</p>
      <p><strong>Bio:</strong> {profile.bio}</p>
    </div>
  )
}
