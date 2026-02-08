import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Alliance = {
  id: string;
  name: string;
};

const RANKS = ["R1", "R2", "R3", "R4", "R5"];

export default function Onboarding() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [alliances, setAlliances] = useState<Alliance[]>([]);

  const [gameName, setGameName] = useState("");
  const [alliance, setAlliance] = useState("");
  const [stateId, setStateId] = useState("");
  const [rank, setRank] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Load alliances for dropdown
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("alliances")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Failed to load alliances:", error);
        return;
      }

      setAlliances(data || []);
    };

    load();
  }, []);

  async function submit() {
    setError(null);

    if (!gameName || !alliance || !stateId || !rank) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Authentication lost. Please log in again.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("onboarding_requests")
      .insert({
        user_id: user.id,
        game_name: gameName,
        alliance_name: alliance,
        alliance_rank: rank,
        status: "pending"
      });

    if (insertError) {
      console.error("Onboarding submit failed:", insertError);
      setError("Submission failed. Please try again.");
      setLoading(false);
      return;
    }

    navigate("/pending-approval", { replace: true });
  }

  return (
    <div className="panel scanner">
      <h2>☣️ Survivor Intake</h2>
      <span className="quarantine-badge">IN QUARANTINE</span>

      <p>Your identity is confirmed, but you are not assigned to a faction.</p>

      <div className="form-grid">

        <label>
          In-game Name
          <input
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Commander name"
          />
        </label>

        <label>
          State
          <input
            value={stateId}
            onChange={e => setStateId(e.target.value)}
            placeholder="e.g. 789"
          />
        </label>

        <label>
          Alliance
          <select value={alliance} onChange={e => setAlliance(e.target.value)}>
            <option value="">Select alliance</option>
            {alliances.map(a => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Rank
          <select value={rank} onChange={e => setRank(e.target.value)}>
            <option value="">Select rank</option>
            {RANKS.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {error && <div className="form-error">☠️ {error}</div>}

        <button
          type="button"
          className="hq-btn primary"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Submitting…" : "Request Access"}
        </button>
      </div>
    </div>
  );
}
