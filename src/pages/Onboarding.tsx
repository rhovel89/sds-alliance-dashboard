import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const oauthSignIn = async (provider: "google" | "discord") => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + "/onboarding" },
  });
  if (error) alert(error.message);
};


type Alliance = {
  id: string;
  name: string;
};

const RANKS = ["R1", "R2", "R3", "R4", "R5"];

export default function Onboarding() {
  // SA_ONBOARDING_BYPASS:
  // If the player already has an alliance assignment, skip onboarding forever.
  const saOnboardingNavigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;

        // Prefer player_alliances via players.id (common in this app)
        let hasAlliance = false;

        const { data: player, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (!pErr && player?.id) {
          const paRes = await supabase
            .from("player_alliances")
            .select("alliance_code")
            .eq("player_id", player.id)
            .limit(1);

          if (!paRes.error) {
            hasAlliance = Array.isArray(paRes.data) && paRes.data.length -gt 0;
          }
        }

        // Fallback: alliance_members by auth uid (in case player_alliances isn't used)
        if (-not hasAlliance) {
          const amRes = await supabase
            .from("alliance_members")
            .select("alliance_id")
            .eq("user_id", uid)
            .limit(1);

          if (!amRes.error) {
            hasAlliance = Array.isArray(amRes.data) && amRes.data.length -gt 0;
          }
        }

        if (hasAlliance -and -not cancelled) {
          saOnboardingNavigate("/dashboard", { replace: true });
        }
      } catch {
        # ignore
      }
    })();

    return () => { cancelled = true; };
  }, [saOnboardingNavigate]);

  // --- BEGIN AUTO-REDIRECT IF APPROVED ---
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;
        if (!uid) return;

        let playerId: string | null = null;

        // 1) player_auth_links -> player_id
        {
          const { data, error } = await supabase
            .from("player_auth_links")
            .select("player_id")
            .eq("user_id", uid)
            .maybeSingle();

          if (!error && data?.player_id) playerId = data.player_id;
        }

        // 2) fallback: players.auth_user_id -> id
        if (!playerId) {
          const { data, error } = await supabase
            .from("players")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();

          if (!error && data?.id) playerId = data.id;
        }

        if (!playerId) return;

        // 3) if assigned to at least 1 alliance -> they are past onboarding
        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("alliance_code")
          .eq("player_id", playerId)
          .limit(1);

        if (!paErr && pa && pa.length > 0 && !cancelled) {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // ignore; onboarding continues normally
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);
  // --- END AUTO-REDIRECT IF APPROVED ---

  // --- BEGIN AUTO-REDIRECT: SKIP ONBOARDING IF APPROVED+ASSIGNED ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;

        // Resolve player_id for this auth user
        let playerId: string | null = null;

        // 1) Preferred: player_auth_links (user_id -> player_id)
        const { data: link } = await supabase
          .from("player_auth_links")
          .select("player_id")
          .eq("user_id", uid)
          .maybeSingle();

        playerId = (link as any)?.player_id ?? null;

        // 2) Fallback: players.auth_user_id -> players.id
        if (!playerId) {
          const { data: p } = await supabase
            .from("players")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();
          playerId = (p as any)?.id ?? null;
        }

        if (!playerId) return;

        // If they have at least one alliance membership, they’re approved+assigned -> skip onboarding
        const { data: memberships } = await supabase
          .from("player_alliances")
          .select("id")
          .eq("player_id", playerId)
          .limit(1);

        if (cancelled) return;

        if (Array.isArray(memberships) && memberships.length > 0) {
          window.location.replace("/dashboard");
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  // --- END AUTO-REDIRECT: SKIP ONBOARDING IF APPROVED+ASSIGNED ---

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
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => oauthSignIn("google")}>Continue with Google</button>
        <button onClick={() => oauthSignIn("discord")}>Continue with Discord</button>
      </div>
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








