import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function Onboarding() {
  const { session } = useAuth();
  const [gameName, setGameName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [rank, setRank] = useState("Member");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!session) return;

    await supabase.from("onboarding_requests").insert({
      user_id: session.user.id,
      game_name: gameName,
      alliance_name: allianceName,
      alliance_rank: rank,
    });

    setSubmitted(true);
  }

  if (submitted) {
    return <p>✅ Onboarding submitted. Waiting for approval.</p>;
  }

  return (
    <div className='page' style={{ padding: 32 }}>
      <h2>Alliance Onboarding</h2>

      <input
        placeholder="Game Name"
        value={gameName}
        onChange={e => setGameName(e.target.value)}
      />

      <input
        placeholder="Alliance Name"
        value={allianceName}
        onChange={e => setAllianceName(e.target.value)}
      />

      <select value={rank} onChange={e => setRank(e.target.value)}>
        <option>R5</option>
        <option>R4</option>
        <option>Member</option>
      </select>

      <button onClick={submit}>Submit</button>
    </div>
  );
}


