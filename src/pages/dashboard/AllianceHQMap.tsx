import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/hq-map.css';

type HQSlot = {
  id: string;
  label: string | null;
  slot_x: number;
  slot_y: number;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from('alliance_hq_map')
      .select('id,label,slot_x,slot_y')
      .eq('alliance_id', alliance_id.toUpperCase())
      .then(({ data }) => {
        setSlots(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found.</p>
      )}

      <div className="hq-map-container">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={\hq-slot \\}
            style={{
              left: slot.slot_x,
              top: slot.slot_y
            }}
          >
            <strong>{slot.label || 'Empty'}</strong>
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}
      </div>
    </div>
  );
}
