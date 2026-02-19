import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Section = {
  id: string;
  alliance_code?: string | null;
  title: string;
  description?: string | null;
  mode?: "readonly" | "discussion" | string | null;
  readonly?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function normAllianceCode(v?: string | null) {
  return String(v ?? "").trim().toUpperCase();
}

export function AllianceGuidesPanel(props: { allianceCode?: string | null; limit?: number }) {
  const params = useParams();

  // Supports multiple route param naming styles: :alliance_id, :alliance_code, :code
  const allianceCode = useMemo(() => {
    const p: any = params as any;
    return normAllianceCode(props.allianceCode ?? p.alliance_id ?? p.alliance_code ?? p.code ?? p.alliance);
  }, [params, props.allianceCode]);

  const limit = props.limit ?? 100;

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newReadonly, setNewReadonly] = useState(false);

  const refetch = async () => {
    if (!allianceCode) return;
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("guide_sections")
      .select("id, alliance_code, title, description, mode, readonly, updated_at, created_at")
      .eq("alliance_code", allianceCode)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      setErr(error.message);
      setSections([]);
    } else {
      setSections((data ?? []) as Section[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const createSection = async () => {
    const title = newTitle.trim();
    if (!allianceCode) return alert("No alliance code found in URL.");
    if (!title) return;

    setSaving(true);
    setErr(null);

    // Prefer schema that supports "mode" (readonly/discussion)
    const payloadA: any = {
      alliance_code: allianceCode,
      title,
      description: null,
      mode: newReadonly ? "readonly" : "discussion",
    };

    let inserted: any = null;

    const resA = await supabase.from("guide_sections").insert(payloadA).select("*").single();
    if (!resA.error) {
      inserted = resA.data;
    } else {
      const msg = String(resA.error.message ?? "").toLowerCase();

      // Fallback schema that supports "readonly" boolean
      if (msg.includes("column") && msg.includes("mode")) {
        const payloadB: any = {
          alliance_code: allianceCode,
          title,
          description: null,
          readonly: !!newReadonly,
        };

        const resB = await supabase.from("guide_sections").insert(payloadB).select("*").single();
        if (resB.error) {
          setErr(resB.error.message);
          setSaving(false);
          return;
        }
        inserted = resB.data;
      } else {
        setErr(resA.error.message);
        setSaving(false);
        return;
      }
    }

    setNewTitle("");
    // optimistic update
    setSections((prev) => [inserted as Section, ...prev].slice(0, limit));
    setSaving(false);

    // also refetch (keeps ordering/columns correct)
    await refetch();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Guides</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {allianceCode ? `Alliance: ${allianceCode}` : "No alliance in URL (expected /dashboard/:CODE/guides)"}
          </div>
        </div>

        <button
          onClick={refetch}
          disabled={!allianceCode || loading}
          style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}
        >
          ↻ Refresh
        </button>
      </div>

      {err ? (
        <div style={{ border: "1px solid #552", background: "#221", padding: 10, borderRadius: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create section</div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Section title (ex: Hunt Mastery)"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}
          />

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, opacity: 0.9 }}>
            <input type="checkbox" checked={newReadonly} onChange={(e) => setNewReadonly(e.target.checked)} />
            Read-only section (no comments)
          </label>

          <button
            onClick={createSection}
            disabled={!allianceCode || saving || !newTitle.trim()}
            style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 900 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Sections</div>

        {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}
        {!loading && sections.length === 0 ? <div style={{ opacity: 0.75 }}>No sections yet.</div> : null}

        {sections.map((s) => {
          const mode = (s.mode ?? (s.readonly ? "readonly" : "discussion")) as any;
          return (
            <div key={s.id} style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{s.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{mode}</div>
              </div>
              {s.description ? <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>{s.description}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AllianceGuidesPanel;
