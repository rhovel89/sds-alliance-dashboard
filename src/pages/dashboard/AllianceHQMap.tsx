import { useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMyAlliances } from '../../hooks/useMyAlliances';
import { usePermissions } from '../../hooks/usePermissions';

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const { alliances } = useMyAlliances();
  const permissions = usePermissions();
  const alliance_id = alliances?.[0]?.alliance_id;

  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (!alliance_id) return;
    supabase
      .from('alliance_hq_map')
      .select('*')
      .eq('alliance_id', alliance_id)
      .then(res => setSlots(res.data || []));
  }, [alliance_id]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance HQ Map</h1>
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
