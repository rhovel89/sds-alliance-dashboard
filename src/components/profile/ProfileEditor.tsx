import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import ProfileHQEditor from "./ProfileHQEditor";

type Profile = {
  id: string;
  in_game_name: string | null;
  discord_name: string | null;
  timezone: string | null;
};

export default function ProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("player_profiles")
      .select("id,in_game_name,discord_name,timezone")
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  async function save() {
    if (!profile) return;

    await supabase
      .from("player_profiles")
      .update(profile)
      .eq("id", profile.id);
  }

  if (loading) return <div>Loading profile…</div>;
  if (!profile) return <div>No profile found.</div>;

  return (
    <>
      <div className="panel">
        <label>In-Game Name</label>
        <input value={profile.in_game_name ?? ""} onChange={e =>
          setProfile({ ...profile, in_game_name: e.target.value })
        } />

        <label>Discord Name</label>
        <input value={profile.discord_name ?? ""} onChange={e =>
          setProfile({ ...profile, discord_name: e.target.value })
        } />

        <label>Timezone</label>
        <input value={profile.timezone ?? ""} onChange={e =>
          setProfile({ ...profile, timezone: e.target.value })
        } />

        <button onClick={save}>Save Profile</button>
      </div>

      <ProfileHQEditor />
    </>
  );
}
