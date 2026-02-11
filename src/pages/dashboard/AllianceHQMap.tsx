import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type HQSlot = {
  id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<HQSlot[]>([]);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from('alliance_hq_map')
      .select('id, slot_x, slot_y, label')
      .eq('alliance_id', alliance_id.toUpperCase())
      .then(({ data }) => setSlots(data ?? []));
  }, [alliance_id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h2>

      <div
        style={{
          position: 'relative',
          width: 1024,
          height: 1024,
          border: '2px solid red',
          marginTop: 24
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: 'absolute',
              left: slot.slot_x,
              top: slot.slot_y,
              background: '#7CFF00',
              color: '#000',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {slot.label ?? 'EMPTY'}
            <br />
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}
      </div>
    </div>
  );
}
