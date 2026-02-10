import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

type HQSlot = {
  id: string;
  label: string | null;
  slot_x: number;
  slot_y: number;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const permissions = usePermissions();
  const [slots, setSlots] = useState<HQSlot[]>([]);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from('alliance_hq_map')
      .select('*')
      .eq('alliance_id', alliance_id)
      .then(({ data }) => {
        setSlots(data || []);
      });
  }, [alliance_id]);

  return (
    <div className="zombie-hq-map" style={{ padding: 24 }}>
      <h1>🧟 Alliance HQ Map</h1>

      <div className="hq-grid">
        {slots.map(s => (
          <div key={s.id} className="hq-slot">
            <strong>{s.label || 'Empty'}</strong>
            <div>X:{s.slot_x} Y:{s.slot_y}</div>
          </div>
        ))}
      </div>

      {!permissions.canManageRoles && (
        <p style={{ opacity: 0.6 }}>Read-only view</p>
      )}
    </div>
  );
}
