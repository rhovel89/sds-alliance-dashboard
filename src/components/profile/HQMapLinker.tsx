import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function HQMapLinker({ hqId }: { hqId: string }) {
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("hq_map_slots")
      .select("id,x,y")
      .is("occupied_by_hq_id", null)
      .order("y,x")
      .then(({ data }) => setSlots(data ?? []));
  }, []);

  async function link(slotId: string) {
    await supabase
      .from("hq_map_slots")
      .update({ occupied_by_hq_id: hqId })
      .eq("id", slotId);

    await supabase
      .from("player_hqs")
      .update({ hq_map_slot_id: slotId })
      .eq("id", hqId);

    alert("HQ linked to map slot.");
  }

  return (
    <select onChange={e => link(e.target.value)}>
      <option>Select HQ Map Slot</option>
      {slots.map(s => (
        <option key={s.id} value={s.id}>
          ({s.x},{s.y})
        </option>
      ))}
    </select>
  );
}
