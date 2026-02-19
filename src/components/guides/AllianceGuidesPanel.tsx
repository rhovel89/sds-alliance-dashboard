import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Section = {
  id: string;
  alliance_code: string;
  title: string;
  description?: string | null;
  mode: "readonly" | "discussion";
  updated_at?: string | null;
};

function getAllianceCodeFromParams(params: Record<string, string | undefined>) {
  return (params.code || params.allianceCode || params.tag || (Object.values(params)[0] ?? "") || "").toString();
}

export default function AllianceGuidesPanel() {
  
  const __sectionAllianceCode = String(window.location.pathname.split("/")[2] ?? "").toUpperCase();
const params = useParams();
  const allianceCode = useMemo(() => getAllianceCodeFromParams(params as any).toUpperCase().trim(), [params]);

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, mode, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setSections((data as any) ?? []);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allianceCode) return;
    load();
    const ch = supabase
      .channel("guides_panel_" + allianceCode)
      .on("postgres_changes", { event: "*", schema: "public", table: "guide_sections", filter: "alliance_code=eq." + allianceCode }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>📓 Guides</h3>
        {allianceCode ? (
          <a href={`/dashboard/${encodeURIComponent(allianceCode)}/guides`} style={{ textDecoration: "none" }}>
            Open →
          </a>
        ) : null}
      </div>

      {loading ? (
        <div style={{ padding: 10, opacity: 0.85 }}>Loading…</div>
      ) : sections.length === 0 ? (
        <div style={{ padding: 10, opacity: 0.85 }}>No guide sections yet.</div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`/dashboard/${encodeURIComponent(allianceCode)}/guides?section=${encodeURIComponent(s.id)}`}
              style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, textDecoration: "none" }}
            >
              <div style={{ fontWeight: 900 }}>{s.title}</div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>{s.mode === "readonly" ? "🔒 Read-only" : "💬 Discussion"}</div>
              {s.description ? <div style={{ opacity: 0.85, marginTop: 6 }}>{s.description}</div> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

