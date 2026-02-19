import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAllianceManagerAccess } from "../../hooks/useAllianceManagerAccess";

type Section = {
  id: string;
  alliance_code: string;
  title: string;
  description?: string | null;
  mode?: "readonly" | "discussion" | string | null;
  updated_at?: string | null;
};

function getAllianceFromParams(p: any) {
  const raw =
    p?.alliance_id ??
    p?.alliance_code ??
    p?.code ??
    p?.alliance ??
    "";
  return String(raw || "").trim().toUpperCase();
}

export default function AllianceGuidesPanel() {
  const params = useParams();
  const allianceCode = useMemo(() => getAllianceFromParams(params as any), [params]);

  const { isManager, isAppAdmin } = useAllianceManagerAccess(allianceCode);
  const canWrite = isAppAdmin || isManager; // Owner/R4/R5 + app admins

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"discussion" | "readonly">("discussion");

  const fetchSections = async () => {
    if (!allianceCode) return;
    setLoading(true);
    setErr(null);

    // Try with 'mode' column first, fallback if schema older
    const q1 = await supabase
      .from("guide_sections")
      .select("id, alliance_code, title, description, mode, updated_at")
      .eq("alliance_code", allianceCode)
      .order("updated_at", { ascending: false });

    if (!q1.error) {
      setSections((q1.data || []) as any);
      setLoading(false);
      return;
    }

    const msg = (q1.error.message || "").toLowerCase();
    const missingMode = msg.includes("column") && msg.includes("mode");

    if (!missingMode) {
      setErr(q1.error.message);
      setLoading(false);
      return;
    }

    const q2 = await supabase
      .from("guide_sections")
      .select("id, alliance_code, title, description, updated_at, readonly")
      .eq("alliance_code", allianceCode)
      .order("updated_at", { ascending: false });

    if (q2.error) {
      setErr(q2.error.message);
      setLoading(false);
      return;
    }

    const mapped = (q2.data || []).map((r: any) => ({
      ...r,
      mode: r.readonly ? "readonly" : "discussion",
    }));

    setSections(mapped as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const createSection = async () => {
    const clean = title.trim();
    if (!clean) return alert("Section title required.");
    if (!allianceCode) return alert("Missing alliance code in URL (/dashboard/:CODE/guides).");

    setErr(null);

    // Attempt A: insert with mode
    const a = await supabase
      .from("guide_sections")
      .insert({
        alliance_code: allianceCode,
        title: clean,
        description: null,
        mode,
      } as any)
      .select("id, alliance_code, title, description, mode, updated_at")
      .single();

    if (!a.error) {
      setTitle("");
      setMode("discussion");
      setSections((prev) => [a.data as any, ...prev]);
      return;
    }

    const msg = (a.error.message || "").toLowerCase();
    const missingMode = msg.includes("column") && msg.includes("mode");

    if (!missingMode) {
      setErr(a.error.message);
      return;
    }

    // Attempt B: fallback to readonly boolean schema
    const b = await supabase
      .from("guide_sections")
      .insert({
        alliance_code: allianceCode,
        title: clean,
        description: null,
        readonly: mode === "readonly",
      } as any)
      .select("id, alliance_code, title, description, updated_at, readonly")
      .single();

    if (b.error) {
      setErr(b.error.message);
      return;
    }

    const row: any = { ...(b.data as any), mode: (b.data as any)?.readonly ? "readonly" : "discussion" };
    setTitle("");
    setMode("discussion");
    setSections((prev) => [row, ...prev]);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Guides</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>/dashboard/{allianceCode || "?"}/guides</div>
        </div>
      </div>

      {canWrite ? (
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Create Section</div>

          <input
            placeholder="Section title (ex: Hunt Mastery)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: 10, borderRadius: 10 }}
          />

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ padding: 10, borderRadius: 10 }}>
              <option value="discussion">Discussion</option>
              <option value="readonly">Read-only</option>
            </select>
          </label>

          <button onClick={createSection} style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 900 }}>
            Save Section
          </button>

          {err ? <div style={{ color: "#ff9b9b", fontSize: 12 }}>Error: {err}</div> : null}
        </div>
      ) : (
        <div style={{ opacity: 0.8, fontSize: 12 }}>
          View only. Owner / R4 / R5 can create sections.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {loading ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}

        {!loading && sections.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No sections yet.</div>
        ) : null}

        {sections.map((s) => (
          <div key={s.id} style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>{s.title}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{String(s.mode || "").toUpperCase()}</div>
            </div>
            {s.description ? <div style={{ opacity: 0.85, marginTop: 6 }}>{s.description}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
