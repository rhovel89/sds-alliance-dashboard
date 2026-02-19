import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Section = {
  id: string;
  alliance_code: string;
  title: string;
  description?: string | null;
  updated_at?: string | null;
  // schema variants (some DBs use mode, others use readonly)
  mode?: string | null;
  readonly?: boolean | null;
};

function getAllianceCodeFromLocation(): string {
  if (typeof window === "undefined") return "";
  const raw = `${window.location.pathname || ""}${window.location.hash || ""}`;
  const m = raw.match(/\/dashboard\/([^\/?#]+)(?:\/|$)/i);
  return String(m?.[1] ?? "").toUpperCase();
}

export default function AllianceGuidesPanel(props: any) {
  const params = useParams() as any;

  const allianceFromProps = String(props?.allianceCode ?? props?.alliance_id ?? "").toUpperCase();
  const allianceFromRoute = String(params?.alliance_id ?? params?.allianceCode ?? params?.code ?? "").toUpperCase();
  const allianceCode = allianceFromProps || allianceFromRoute || getAllianceCodeFromLocation();

  const [userId, setUserId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  // We’ll detect whether your table uses `mode` or `readonly`
  const [schemaHasMode, setSchemaHasMode] = useState<boolean | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newReadonly, setNewReadonly] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  const refetch = async () => {
    if (!allianceCode) return;

    setLoading(true);
    try {
      // Try schema A: mode column
      const resA = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, mode, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!resA.error) {
        setSchemaHasMode(true);
        setSections((resA.data ?? []) as Section[]);
        return;
      }

      const msg = String(resA.error.message ?? "").toLowerCase();
      const missingMode = msg.includes("mode") && msg.includes("column");
      if (!missingMode) {
        console.error(resA.error);
        return;
      }

      // Fallback schema B: readonly column
      const resB = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, readonly, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (resB.error) {
        console.error(resB.error);
        return;
      }
      setSchemaHasMode(false);
      setSections((resB.data ?? []) as Section[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const createSection = async () => {
    const title = newTitle.trim();
    if (!title) return alert("Section title required.");
    if (!allianceCode) return alert("Alliance code missing (open guides from /dashboard/:code/guides).");
    if (!userId) return alert("No user session.");

    // base payload (we'll drop created_by/updated_by if your table doesn't have them)
    const base: any = {
      alliance_code: allianceCode,
      title,
      description: null,
      created_by: userId,
      updated_by: userId,
    };

    const tryModeFirst = schemaHasMode !== false;

    const attemptInsert = async (useMode: boolean) => {
      const payload = useMode
        ? { ...base, mode: newReadonly ? "readonly" : "discussion" }
        : { ...base, readonly: !!newReadonly };

      // IMPORTANT: use supabase-js so headers include apikey + auth
      return await supabase.from("guide_sections").insert(payload).select("id").single();
    };

    let res = await attemptInsert(tryModeFirst);

    // If audit columns don't exist, retry without them
    if (res.error) {
      const msg = String(res.error.message ?? "").toLowerCase();
      const missingCreatedBy = msg.includes("created_by") && msg.includes("column");
      const missingUpdatedBy = msg.includes("updated_by") && msg.includes("column");

      if (missingCreatedBy || missingUpdatedBy) {
        delete base.created_by;
        delete base.updated_by;
        res = await attemptInsert(tryModeFirst);
      }
    }

    // If schema mismatch (mode vs readonly), retry the other way
    if (res.error) {
      const msg = String(res.error.message ?? "").toLowerCase();
      const missingMode = msg.includes("mode") && msg.includes("column");
      const missingReadonly = msg.includes("readonly") && msg.includes("column");

      if (missingMode || missingReadonly) {
        res = await attemptInsert(!tryModeFirst);
      }
    }

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }

    setNewTitle("");
    setNewReadonly(false);
    await refetch();
  };

  return (
    <div style={{ border: "1px solid #222", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>📚 Guide Sections</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Alliance: <strong>{allianceCode || "(missing)"}</strong>
          </div>
        </div>
        <button onClick={refetch} disabled={loading} style={{ padding: "8px 10px", borderRadius: 10 }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <input
            placeholder="New section title (ex: Hunt Mastery)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #333" }}
          />
          <button onClick={createSection} style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 800 }}>
            Save
          </button>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, opacity: 0.9 }}>
          <input type="checkbox" checked={newReadonly} onChange={(e) => setNewReadonly(e.target.checked)} />
          Read-only section (no discussion posts)
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          {sections.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No sections yet.</div>
          ) : (
            sections.map((s) => (
              <div key={s.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>{s.title}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {s.mode ? `Mode: ${s.mode}` : (typeof s.readonly === "boolean" ? `Read-only: ${s.readonly}` : null)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}