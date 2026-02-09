import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type HQ = {
  id: string;
  hq_name: string;
  hq_level: number;
  troop_type: string;
  troop_tier: string;
  march_size: number;
  rally_size: number;
  lair_level: number;
};

export default function PlayerHQEditor({ profileId }: { profileId: string }) {
  const [hqs, setHqs] = useState<HQ[]>([]);

  useEffect(() => {
    supabase
      .from("player_hqs")
      .select("*")
      .eq("profile_id", profileId)
      .then(({ data }) => setHqs(data ?? []));
  }, [profileId]);

  const addHQ = async () => {
    const { data } = await supabase
      .from("player_hqs")
      .insert({ profile_id: profileId })
      .select()
      .single();
    if (data) setHqs([...hqs, data]);
  };

  const updateHQ = async (id: string, field: string, value: any) => {
    await supabase.from("player_hqs").update({ [field]: value }).eq("id", id);
  };

  const removeHQ = async (id: string) => {
    await supabase.from("player_hqs").delete().eq("id", id);
    setHqs(hqs.filter(h => h.id !== id));
  };

  return (
    <div>
      <h3>🏰 HQs</h3>
      <button onClick={addHQ}>➕ Add HQ</button>

      {hqs.map(hq => (
        <div key={hq.id}>
          <input placeholder="HQ Name" defaultValue={hq.hq_name}
            onBlur={e => updateHQ(hq.id,"hq_name",e.target.value)} />

          <input type="number" placeholder="HQ Level" defaultValue={hq.hq_level}
            onBlur={e => updateHQ(hq.id,"hq_level",+e.target.value)} />

          <select defaultValue={hq.troop_type}
            onChange={e => updateHQ(hq.id,"troop_type",e.target.value)}>
            <option>Shooter</option>
            <option>Fighter</option>
            <option>Rider</option>
          </select>

          <select defaultValue={hq.troop_tier}
            onChange={e => updateHQ(hq.id,"troop_tier",e.target.value)}>
            {["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"].map(t =>
              <option key={t}>{t}</option>
            )}
          </select>

          <button onClick={() => removeHQ(hq.id)}>🗑️</button>
        </div>
      ))}
          <label>
        HQ Map Slot (1–400)
        <input
          type="number"
          min={1}
          max={400}
          value={hq.hq_map_slot ?? ""}
          onChange={(e) =>
            onChange({ ...hq, hq_map_slot: Number(e.target.value) || undefined })
          }
        />
      </label>
</div>
  );
}
