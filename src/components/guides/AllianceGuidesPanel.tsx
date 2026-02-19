import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type Mode = "readonly" | "discussion";

type SectionRow = {
  id: string;
  alliance_code: string;
  title: string;
  description?: string | null;
  // newer schema
  mode?: Mode | string | null;
  // older schema (some builds used boolean)
  readonly?: boolean | null;
  updated_at?: string | null;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

// supports common param names used across the app
function allianceFromParams(p: Record<string, string | undefined>) {
  const raw =
    (p as any).alliance_id ??
    (p as any).alliance_code ??
    (p as any).code ??
    (p as any).alliance ??
    "";
  return upper(raw);
}

function rowMode(s: SectionRow): Mode {
  const m = String(s.mode ?? "").trim().toLowerCase();
  if (m === "readonly" || m === "discussion") return m as Mode;
  return s.readonly ? "readonly" : "discussion";
}

export default function AllianceGuidesPanel() {
  const params = useParams();
  const allianceCode = useMemo(() => allianceFromParams(params as any), [params]);

  // NOTE: we don’t change your permission system here.
  // Whatever useHQPermissions returns is what controls Create Section visibility.
  const { canEdit } = useHQPermissions(allianceCode);

  const [userId, setUserId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("discussion");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  const refetch = async () => {
    if (!allianceCode) return;

    setLoading(true);
    setErr(null);

    try {
      // Try the richer select first (mode/readonly exist on newer builds)
      const res = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, mode, readonly, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (res.error) {
        // Fallback: minimal columns
        const res2 = await supabase
          .from("guide_sections")
          .select("id, alliance_code, title, description, updated_at")
          .eq("alliance_code", allianceCode)
          .order("updated_at", { ascending: false })
          .limit(200);

        if (res2.error) throw res2.error;
        setSections((res2.data ?? []) as any);
      } else {
        setSections((res.data ?? []) as any);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const createSection = async () => {
    const clean = title.trim();
    if (!clean) return;

    if (!allianceCode) return alert("Missing alliance code in URL (/dashboard/<CODE>/guides).");

    let uid = userId;
    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data?.user?.id ?? null;
      setUserId(uid);
    }
    if (!uid) return alert("Not logged in.");

    setErr(null);

    // Insert attempt A: mode + created_by (newer schema)
    const payloadA: any = {
      alliance_code: allianceCode,
      title: clean,
      description: null,
      mode,
      created_by: uid,
    };

    let ins = await supabase.from("guide_sections").insert(payloadA).select("id").single();

    if (ins.error) {
      const msg = String(ins.error.message ?? "").toLowerCase();
      const missingMode = msg.includes("column") && msg.includes("mode");
      const missingCreatedBy = msg.includes("column") && msg.includes("created_by");

      // Insert attempt B: readonly boolean (older schema), optionally include created_by if it exists
      if (missingMode || missingCreatedBy) {
        const payloadB: any = {
          alliance_code: allianceCode,
          title: clean,
          description: null,
          readonly: mode === "readonly",
        };
        if (!missingCreatedBy) payloadB.created_by = uid;

        const ins2 = await supabase.from("guide_sections").insert(payloadB).select("id").single();
        if (ins2.error) {
          console.error(ins2.error);
          setErr(ins2.error.message);
          alert(ins2.error.message);
          return;
        }
      } else {
        console.error(ins.error);
        setErr(ins.error.message);
        alert(ins.error.message);
        return;
      }
    }

    setTitle("");
    setMode("discussion");
    await refetch();
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ opacity: 0.8, fontSize: 12 }}>
        Guides {allianceCode ? `/dashboard/${allianceCode}/guides` : "(missing alliance code)"}
      </div>

      {canEdit ? (
        <div style={{ marginTop: 12, border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Create Section</div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title (ex: Hunt Mastery)"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #333" }}
          />

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #333" }}
              >
                <option value="discussion">Discussion</option>
                <option value="readonly">Read only</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={createSection}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Save Section
          </button>

          {err ? (
            <div style={{ marginTop: 10, color: "#ff8080", fontSize: 12, whiteSpace: "pre-wrap" }}>
              {err}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>View only</div>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Sections</div>

          {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

          {!loading && sections.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No sections yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sections.map((s) => {
                const m = rowMode(s);
                const active = selectedId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 10,
                      border: active ? "2px solid #2a60ff" : "1px solid #333",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{s.title}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>{m.toUpperCase()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Selected section</div>

          {!selected ? (
            <div style={{ opacity: 0.75 }}>Click a section on the left.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{selected.title}</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Mode: {rowMode(selected).toUpperCase()}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Section ID: <code>{selected.id}</code>
              </div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                (Next step later: attach guides/posts inside this section.)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
