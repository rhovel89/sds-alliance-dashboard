import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = { code: string; name: string; enabled: boolean };

type AccessRequest = {
  id: string;
  user_id: string;
  game_name: string;
  requested_alliances: string[];
  status: "pending" | "approved" | "denied";
  decision_reason: string | null;
  created_at: string;
};

export default function RequestAccessPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [latest, setLatest] = useState<AccessRequest | null>(null);

  const [gameName, setGameName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => "🧟 Onboarding — Request Access", []);

  async function boot() {
    setError(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);

    const a = await supabase.from("alliances").select("code, name, enabled").order("code");
    if (a.error) return setError(a.error.message);
    setAlliances((a.data ?? []) as any);

    if (!uid) return;

    const r = await supabase
      .from("access_requests")
      .select("id, user_id, game_name, requested_alliances, status, decision_reason, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) return setError(r.error.message);
    setLatest((r.data ?? null) as any);

    if (r.data?.game_name) setGameName(r.data.game_name);
    if (Array.isArray(r.data?.requested_alliances)) {
      const map: Record<string, boolean> = {};
      r.data.requested_alliances.forEach((x: string) => (map[String(x).toUpperCase()] = true));
      setSelected(map);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledAlliances = alliances.filter((a) => a.enabled);

  const selectedCodes = useMemo(() => {
    return Object.keys(selected).filter((k) => selected[k]).sort();
  }, [selected]);

  async function submit() {
    setError(null);
    if (!userId) return alert("You must be logged in.");

    const gn = gameName.trim();
    if (!gn) return alert("Game Name is required.");
    if (selectedCodes.length === 0) return alert("Select at least one alliance.");

    // Optional: prevent spamming multiple pending requests
    if (latest?.status === "pending") return alert("You already have a pending request.");

    const res = await supabase.from("access_requests").insert({
      user_id: userId,
      game_name: gn,
      requested_alliances: selectedCodes,
      status: "pending",
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    alert("Request submitted. Wait for Owner approval.");
    await boot();
  }

  async function cancelPending() {
    if (!latest || latest.status !== "pending") return;
    const ok = confirm("Cancel your pending request?");
    if (!ok) return;

    setError(null);
    const res = await supabase.from("access_requests").delete().eq("id", latest.id);
    if (res.error) return setError(res.error.message);

    await boot();
  }

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>

      <div style={{ marginBottom: 12 }}>
        <a href="/dashboard">Go to My Dashboards</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {latest ? (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Your latest request</div>
          <div>Status: <strong>{latest.status}</strong></div>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
            Alliances: {Array.isArray(latest.requested_alliances) ? latest.requested_alliances.join(", ") : ""}
          </div>
          {latest.status === "denied" && latest.decision_reason ? (
            <div style={{ marginTop: 6 }}>Reason: {latest.decision_reason}</div>
          ) : null}

          {latest.status === "pending" ? (
            <div style={{ marginTop: 10 }}>
              <button onClick={cancelPending}>Cancel Request</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Submit new request</div>

        <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
          <input
            placeholder='Game Name (ex: "Seven")'
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />

          <div style={{ fontWeight: 800 }}>Select alliance(s)</div>

          <div style={{ display: "grid", gap: 6 }}>
            {enabledAlliances.map((a) => (
              <label key={a.code} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!selected[a.code]}
                  onChange={(e) => setSelected({ ...selected, [a.code]: e.target.checked })}
                />
                <span>
                  <strong>{a.code}</strong> — {a.name}
                </span>
              </label>
            ))}
          </div>

          <button onClick={submit}>Submit Request</button>

          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Owner must approve. No automatic alliance assignment happens on OAuth.
          </div>
        </div>
      </div>
    </div>
  );
}
