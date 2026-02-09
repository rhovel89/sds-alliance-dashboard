import { useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMyAlliances } from '../../hooks/useMyAlliances';
import { usePermissions } from '../../hooks/usePermissions';

export default function AllianceHQMap() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const { alliances } = useMyAlliances();
  const permissions = usePermissions();
  const allianceId = alliances?.[0]?.alliance_id;

  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (!allianceId) return;
    supabase
      .from('alliance_hq_map')
      .select('*')
      .eq('alliance_id', allianceId)
      .then(res => setSlots(res.data || []));
  }, [allianceId]);

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
