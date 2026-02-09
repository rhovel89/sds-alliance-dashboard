import type { PlayerHQ } from '../types/playerHQ';
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useParams , useNavigate} from "react-router-dom";

export default function PlayerProfilePage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [hqs, setHqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alliance_id) return;

      const { data: p } = await supabase
        .from("player_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("alliance_id", alliance_id)
        .maybeSingle();

      const { data: h } = await supabase
        .from("player_hqs")
        .select("*")
        .eq("user_id", user.id)
        .eq("alliance_id", alliance_id);

      setProfile(p);
      setHqs(h || []);
      setLoading(false);
    }

    load();
  }, [alliance_id]);

  async function updateProfile(field: string, value: any) {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("player_profiles")
      .update({ [field]: value })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, [field]: value });
    }

    setSaving(false);
  }

  if (loading) return <div>Loading profile…</div>;
  if (!profile) return <div>No profile found.</div>;

    async function addHQ() {
    if (!profile) return;

    const { data, error } = await supabase
      .from("player_hqs")
      .insert({
        user_id: profile.user_id,
        alliance_id: profile.alliance_id,
        hq_name: "New HQ",
        hq_level: 1,
        troop_type: "Shooter",
        troop_tier: "T5",
        march_size: 0,
        rally_size: 0,
        lair_level: 0
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setHqs(prev => [...prev, data]);
    }
  }

  async function deleteHQ(hqId: string) {
    await supabase
      .from("player_hqs")
      .delete()
      .eq("id", hqId);

    setHqs(prev => prev.filter(h => h.id !== hqId));
  }

  async function updateHQ(hqId: string, field: string, value: any) {
    await supabase
      .from("player_hqs")
      .update({ [field]: value })
      .eq("id", hqId);

    setHqs(prev =>
      prev.map(h => h.id === hqId ? { ...h, [field]: value } : h)
    );
  }
  async function addHQ() {
    if (!profile) return;

    const { data, error } = await supabase
      .from("player_hqs")
      .insert({
        user_id: profile.user_id,
        alliance_id: profile.alliance_id,
        hq_name: "New HQ",
        hq_level: 1,
        troop_type: "Shooter",
        troop_tier: "T5",
        march_size: 0,
        rally_size: 0,
        lair_level: 0
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setHqs(prev => [...prev, data]);
    }
  }

  async function deleteHQ(hqId: string) {
    await supabase
      .from("player_hqs")
      .delete()
      .eq("id", hqId);

    setHqs(prev => prev.filter(h => h.id !== hqId));
  }

  async function updateHQ(hqId: string, field: string, value: any) {
    await supabase
      .from("player_hqs")
      .update({ [field]: value })
      .eq("id", hqId);

    setHqs(prev =>
      prev.map(h => h.id === hqId ? { ...h, [field]: value } : h)
    );
  }
return (
    <div className="page">
      <h1>🧍 My Profile</h1>

      <section>
        <h3>Player Info</h3>

        <label>
          In-game Name
          <input
            value={profile.ingame_name || ""}
            onChange={e => updateProfile("ingame_name", e.target.value)}
          />
        </label>

        <label>
          Timezone
          <input
            value={profile.timezone || ""}
            onChange={e => updateProfile("timezone", e.target.value)}
          />
        </label>

        <label>
          Discord (optional)
          <input
            value={profile.discord_name || ""}
            onChange={e => updateProfile("discord_name", e.target.value)}
          />
        </label>

        {saving && <div>Saving…</div>}
      </section>

      <section>
        <h3>HQs</h3>

        {hqs.length === 0 && <div>No HQs added.</div>}

        {hqs.map(hq => (
          <div key={hq.id} className="card">
            <strong>{hq.hq_name}</strong>
            <div>Level: {hq.hq_level}</div>
            <div>Troop: {hq.troop_type} {hq.troop_tier}</div>
            <div>March: {hq.march_size}</div>
            <div>Rally: {hq.rally_size}</div>
            <div>Lair: {hq.lair_level}        {hq.hq_map_slot && (
          <div className="hq-map-slot">
            🗺️ HQ Map Slot: <strong>{hq.hq_map_slot}</strong>
          </div>
        )}
</div>
          </div>
        ))}

        <button disabled>Add HQ (next step)</button>
      </section>
    </div>
  );
}