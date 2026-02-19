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
  mode?: Mode | string | null;      // newer schema
  readonly?: boolean | null;        // older schema
  updated_at?: string | null;
};

type AnyRow = Record<string, any>;

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

function pickTitle(r: AnyRow): string {
  return String(r.title ?? r.name ?? r.label ?? r.heading ?? "Untitled").trim();
}

function pickBody(r: AnyRow): string {
  const v =
    r.content ??
    r.body ??
    r.text ??
    r.description ??
    r.details ??
    r.notes ??
    "";
  const s = String(v ?? "").trim();
  return s;
}

function pickUpdated(r: AnyRow): string {
  return String(r.updated_at ?? r.updatedAt ?? r.created_at ?? r.createdAt ?? "").trim();
}

function matchesSection(row: AnyRow, sectionId: string, sectionTitle: string): boolean {
  const keys = [
    "section_id",
    "guide_section_id",
    "section_uuid",
    "section",
    "sectionId",
    "sectionID",
  ];

  for (const k of keys) {
    const v = row?.[k];
    if (v == null) continue;
    if (String(v) === String(sectionId)) return true;
  }

  // fallback: some schemas store the section title/name instead
  const titleKeys = ["section_title", "section_name", "sectionTitle", "sectionName"];
  for (const k of titleKeys) {
    const v = row?.[k];
    if (v == null) continue;
    if (String(v).trim().toLowerCase() === String(sectionTitle).trim().toLowerCase()) return true;
  }

  return false;
}

export default function AllianceGuidesPanel() {
  const params = useParams();
  const allianceCode = useMemo(() => allianceFromParams(params as any), [params]);

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

  // "Inside section" rows (best-effort; won't break if you don't have tables yet)
  const [sectionItems, setSectionItems] = useState<AnyRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsErr, setItemsErr] = useState<string | null>(null);
  const [itemsSource, setItemsSource] = useState<string | null>(null);

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
      const res = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, mode, readonly, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (res.error) {
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

  // Auto-select first section so the right panel shows something immediately
  useEffect(() => {
    if (!selectedId && sections.length > 0) {
      setSelectedId(sections[0].id);
    }
  }, [sections, selectedId]);

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

  // Fetch "inside section" rows (best-effort)
  useEffect(() => {
    (async () => {
      setSectionItems([]);
      setItemsErr(null);
      setItemsSource(null);

      if (!selected || !allianceCode) return;

      const tables = [
        "alliance_guides",
        "alliance_guide_posts",
        "guide_posts",
        "guides",
        "alliance_guides_posts",
      ];

      setItemsLoading(true);

      try {
        let found: { table: string; rows: AnyRow[] } | null = null;

        for (const t of tables) {
          // attempt with alliance filter first
          let res = await supabase.from(t).select("*").eq("alliance_code", allianceCode).limit(200);

          // if alliance_code doesn't exist, retry without filter
          if (res.error && String(res.error.message ?? "").toLowerCase().includes("column") && String(res.error.message ?? "").toLowerCase().includes("alliance_code")) {
            res = await supabase.from(t).select("*").limit(200);
          }

          if (!res.error) {
            const raw = (res.data ?? []) as AnyRow[];
            // filter to selected section
            const filtered = raw.filter((r) => matchesSection(r, selected.id, selected.title));
            found = { table: t, rows: filtered };
            break;
          }
        }

        if (!found) {
          // Not an error — you just may not have guides/posts tables yet
          setItemsSource(null);
          setSectionItems([]);
          return;
        }

        // client sort
        const sorted = found.rows.slice().sort((a, b) => {
          const ta = new Date(pickUpdated(a) || 0).getTime();
          const tb = new Date(pickUpdated(b) || 0).getTime();
          return tb - ta;
        });

        setItemsSource(found.table);
        setSectionItems(sorted);
      } catch (e: any) {
        console.error(e);
        setItemsErr(e?.message ?? String(e));
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [selected?.id, allianceCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const FG = "#f3f3f3";
  const MUTED = "rgba(243,243,243,0.72)";

  return (
    <div style={{ padding: 18, color: FG }}>
      <div style={{ opacity: 0.85, fontSize: 12 }}>
        Guides {allianceCode ? `/dashboard/${allianceCode}/guides` : "(missing alliance code)"}
      </div>

      {canEdit ? (
        <div style={{ marginTop: 12, border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Create Section</div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title (ex: Hunt Mastery)"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "transparent",
              color: FG,
            }}
          />

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "transparent",
                  color: FG,
                }}
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
              background: "transparent",
              color: FG,
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
        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, color: MUTED }}>View only</div>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }}>
        <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Sections</div>

          {loading ? <div style={{ color: MUTED }}>Loading…</div> : null}

          {!loading && sections.length === 0 ? (
            <div style={{ color: MUTED }}>No sections yet.</div>
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
                      color: FG,
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
            <div style={{ color: MUTED }}>Click a section on the left.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{selected.title}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>Mode: {rowMode(selected).toUpperCase()}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>
                  Section ID: <code style={{ color: FG }}>{selected.id}</code>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #222", paddingTop: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  Inside this section
                  {itemsSource ? <span style={{ marginLeft: 8, fontSize: 12, color: MUTED }}>(source: {itemsSource})</span> : null}
                </div>

                {itemsLoading ? <div style={{ color: MUTED }}>Loading…</div> : null}
                {itemsErr ? <div style={{ color: "#ff8080", fontSize: 12, whiteSpace: "pre-wrap" }}>{itemsErr}</div> : null}

                {!itemsLoading && !itemsErr && sectionItems.length === 0 ? (
                  <div style={{ color: MUTED }}>
                    No guides/posts found for this section yet.
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      (This will populate once you create guides/posts that are linked to this section.)
                    </div>
                  </div>
                ) : null}

                {sectionItems.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {sectionItems.map((r) => {
                      const t = pickTitle(r);
                      const body = pickBody(r);
                      const when = pickUpdated(r);
                      return (
                        <div key={String(r.id ?? t)} style={{ border: "1px solid #333", borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 900 }}>{t}</div>
                          {when ? <div style={{ color: MUTED, fontSize: 12 }}>{new Date(when).toLocaleString()}</div> : null}
                          {body ? (
                            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                              {body.length > 500 ? body.slice(0, 500) + "…" : body}
                            </div>
                          ) : (
                            <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>(No text content on this item)</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
