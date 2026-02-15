import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AccessRequest = {
  id: string;
  requested_alliances: string[];
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decision_note: string | null;
};

export default function RequestAccessPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [alliances, setAlliances] = useState("");
  const [note, setNote] = useState("");

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function boot() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);
    if (uid) await fetchMine(uid);
  }

  async function fetchMine(uid: string) {
    setError(null);
    const res = await supabase
      .from("access_requests")
      .select("id, requested_alliances, note, status, created_at, decision_note")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (res.error) {
      setError(res.error.message);
      setRequests([]);
      return;
    }

    setRequests((res.data ?? []) as any);
  }

  useEffect(() => {
    boot();
  }, []);

  async function submit() {
    if (!userId) return alert("You must be logged in.");

    const arr = alliances
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (arr.length === 0) return alert("Enter at least one alliance code (ex: WOC).");

    const res = await supabase.from("access_requests").insert({
      user_id: userId,
      requested_alliances: arr,
      note: note.trim() || null,
      status: "pending",
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setAlliances("");
    setNote("");
    await fetchMine(userId);
    alert("Request submitted. Wait for owner approval.");
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Request Access</h2>
      <div style={{ opacity: 0.85, marginBottom: 12 }}>
        Submit your alliance code(s). Owner approves before you can access alliance dashboards.
      </div>

      {!userId ? (
        <div>You must be logged in.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
          {error ? (
            <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10 }}>{error}</div>
          ) : null}

          <input
            placeholder="Alliance codes (comma separated) e.g. WOC, SDS"
            value={alliances}
            onChange={(e) => setAlliances(e.target.value)}
          />

          <textarea
            placeholder="Optional note (in-game name, reason, etc.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={submit}>Submit Request</button>
            <a href="/dashboard" style={{ alignSelf: "center" }}>Go to My Dashboards</a>
          </div>

          <div style={{ marginTop: 14 }}>
            <h3>Your Requests</h3>
            {requests.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No requests yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {requests.map((r) => (
                  <div key={r.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 800 }}>{r.requested_alliances.join(", ")}</div>
                    <div style={{ opacity: 0.85 }}>Status: {r.status}</div>
                    {r.note ? <div style={{ marginTop: 6, opacity: 0.9 }}>Note: {r.note}</div> : null}
                    {r.decision_note ? <div style={{ marginTop: 6, opacity: 0.9 }}>Owner: {r.decision_note}</div> : null}
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
