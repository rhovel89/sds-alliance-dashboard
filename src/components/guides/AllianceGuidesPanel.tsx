import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type SectionRow = {
  id: string;
  alliance_code: string;
  title: string;
  readonly?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  // Optional: if some parent already passes the alliance code
  allianceCode?: string | null;
};

function deriveAllianceCodeFromUrl(): string {
  if (typeof window === "undefined") return "";
  const raw = `${window.location.pathname || ""}${window.location.hash || ""}`;
  const m = raw.match(/\/dashboard\/([^\/?#]+)(?:\/|$)/i);
  return String(m?.[1] ?? "").toUpperCase();
}

export default function AllianceGuidesPanel(props: Props) {
  const params = useParams() as any;

  const allianceCode = useMemo(() => {
    const fromProps = String(props?.allianceCode ?? "").trim();
    const fromParams =
      String(params?.alliance_id ?? "").trim() ||
      String(params?.alliance_code ?? "").trim() ||
      String(params?.code ?? "").trim();

    const fromUrl = deriveAllianceCodeFromUrl();

    return (fromProps || fromParams || fromUrl || "").toUpperCase();
  }, [props?.allianceCode, params]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const refetch = async () => {
    if (!allianceCode) {
      setSections([]);
      setErrorMsg("Alliance code missing. Open Guides from /dashboard/:CODE/guides (ex: /dashboard/WOC/guides).");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("guide_sections")
      .select("id, alliance_code, title, readonly, created_at, updated_at")
      .eq("alliance_code", allianceCode)
      .order("updated_at", { ascending: false });

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return;
    }

    setSections((data || []) as SectionRow[]);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const createSection = async () => {
    const title = newTitle.trim();
    if (!title) return;

    if (!allianceCode) {
      alert("Alliance code missing. Open Guides from /dashboard/:CODE/guides (ex: /dashboard/WOC/guides).");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // IMPORTANT: never send blank alliance_code
    const payload = {
      alliance_code: allianceCode,
      title,
      readonly: false,
    };

    console.log("Creating guide section payload:", payload);

    const { error } = await supabase.from("guide_sections").insert(payload);

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      alert(error.message);
      return;
    }

    setNewTitle("");
    await refetch();
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>📚 Guides</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Alliance: <strong>{allianceCode || "(missing)"}</strong>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="New section title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, minWidth: 260 }}
        />
        <button
          onClick={createSection}
          disabled={saving || !newTitle.trim() || !allianceCode}
          style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 800 }}
        >
          {saving ? "Saving..." : "Save Section"}
        </button>
      </div>

      {errorMsg ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #633", background: "rgba(255,0,0,0.06)" }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Error</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{errorMsg}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading sections...</div>
        ) : sections.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No sections yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sections.map((s) => (
              <div key={s.id} style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>{s.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {s.alliance_code} {s.readonly ? "• readonly" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}