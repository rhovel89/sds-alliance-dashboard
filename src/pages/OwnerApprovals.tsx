import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Request = {
  id: string;
  game_name: string;
  alliance_name: string;
  alliance_rank: string;
};

export default function OwnerApprovals() {
  const { allianceId } = useParams<{ alliance_id: string }>();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("onboarding_requests")
        .select("id, game_name, alliance_name, alliance_rank")
        .eq("status", "pending")
        .order("created_at");

      setRequests(data || []);
      setLoading(false);
    };

    load();
  }, []);

  async function approve(id: string) {
    await supabase.rpc("approve_onboarding_request", {
      p_request_id: id
    });

    setRequests(r => r.filter(x => x.id !== id));
  }

  if (loading) {
    return <div className="panel scanner">Loading approvals…</div>;
  }

  return (
    <div className="panel scanner">
      <h2>☣️ Pending Survivors</h2>

      {requests.length === 0 && <p>No pending requests.</p>}

      {requests.map(r => (
        <div key={r.id} className="approval-card">
          <strong>{r.game_name}</strong>
          <div>Alliance: {r.alliance_name}</div>
          <div>Rank: {r.alliance_rank}</div>

          <button className="hq-btn primary" onClick={() => approve(r.id)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}

import { logAllianceActivity } from '../lib/activityLogger';
async function logApproval(alliance_id: string, userId: string) {
  try {
    await logAllianceActivity({
      allianceId,
      actionType: "member_approved",
      actionLabel: "Member approved",
      metadata: { userId }
    });
  } catch {}
}
