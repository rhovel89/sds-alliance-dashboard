import type { PlayerHQ } from '../../types/playerHQ';
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

const TROOP_TYPES = ["Shooter", "Fighter", "Rider"];
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

export default function ProfileHQEditor() {
  const [hqs, setHqs] = useState<HQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("player_hqs")
      .select("*")
      .order("created_at");

    setHqs(data ?? []);
    setLoading(false);
  }

  async function addHQ() {
    const { data } = await supabase
      .from("player_hqs")
      .insert({
        hq_name: "New HQ",
        hq_level: 1,
        troop_type: "Shooter",
        troop_tier: "T5",
        march_size: 0,
        rally_size: 0,
        lair_level: 0,
      })
      .select()
      .maybeSingle();

    if (data) setHqs([...hqs, data]);
  }

  async function updateHQ(hq: HQ) {
    await supabase.from("player_hqs").update(hq).eq("id", hq.id);
  }

  async function removeHQ(id: string) {
    await supabase.from("player_hqs").delete().eq("id", id);
    setHqs(hqs.filter(h => h.id !== id));
  }

  if (loading) return <div>Loading HQs…</div>;

  return (
    <div className="panel">
      <h3>🏰 Headquarters</h3>

      {hqs.map(hq => (
        <div key={hq.id} className="panel bordered">
          <input
            value={hq.hq_name}
            onChange={e => {
              const v = e.target.value;
              setHqs(hqs.map(h => h.id === hq.id ? { ...h, hq_name: v } : h));
            }}
            onBlur={() => updateHQ(hq)}
          />

          <input type="number" value={hq.hq_level}
            onChange={e => hq.hq_level = +e.target.value}
            onBlur={() => updateHQ(hq)} />

          <select value={hq.troop_type}
            onChange={e => { hq.troop_type = e.target.value; updateHQ(hq); }}>
            {TROOP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>

          <select value={hq.troop_tier}
            onChange={e => { hq.troop_tier = e.target.value; updateHQ(hq); }}>
            {TROOP_TIERS.map(t => <option key={t}>{t}</option>)}
          </select>

          <input type="number" value={hq.march_size}
            onChange={e => hq.march_size = +e.target.value}
            onBlur={() => updateHQ(hq)} />

          <input type="number" value={hq.rally_size}
            onChange={e => hq.rally_size = +e.target.value}
            onBlur={() => updateHQ(hq)} />

          <input type="number" value={hq.lair_level}
            onChange={e => hq.lair_level = +e.target.value}
            onBlur={() => updateHQ(hq)} />

          <button onClick={() => removeHQ(hq.id)}>Remove HQ</button>
        </div>
      ))}

      <button onClick={addHQ}>➕ Add HQ</button>
    </div>
  );
}

