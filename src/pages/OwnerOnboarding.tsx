import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function OwnerOnboarding() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("onboarding_requests")
      .select("*")
      .eq("status", "pending")
      .then(res => setRequests(res.data || []));
  }, []);

  async function approve(id: string) {
    await supabase
      .from("onboarding_requests")
      .update({ status: "approved", reviewed_at: new Date() })
      .eq("id", id);

    setRequests(r => r.filter(x => x.id !== id));
  }

  return (
    <div className='page' style={{ padding: 32 }}>
      <h2>Owner — Onboarding Requests</h2>

      {requests.map(r => (
        <div className='page' key={r.id}>
          <b>{r.game_name}</b> ({r.alliance_name}) — {r.alliance_rank}
          <button onClick={() => approve(r.id)}>Approve</button>
        </div>
      ))}
    </div>
  );
}

