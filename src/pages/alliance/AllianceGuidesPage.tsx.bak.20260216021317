import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const TABLE_SECTIONS = "guide_sections";
const TABLE_POSTS = "guide_posts";
const TABLE_IMAGES = "guide_attachments";
const STORAGE_BUCKET = "alliance-guides";

// Column names (detected / fallback)
const COL_ALLIANCE = "alliance_code";
const COL_SECTION_ID_IN_POSTS = "section_id";
const COL_SECTION_TITLE = "title";
const COL_SECTION_READONLY = "readonly";
const COL_POST_BODY = "body";
const COL_POST_CREATED_BY = "created_by";
const COL_IMG_POST_ID = "post_id";
const COL_IMG_URL = "url";

type AnyRow = Record<string, any>;

function upperCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function AllianceGuidesPage() {
  const params = useParams();
  const raw = (params as any)?.allianceCode ?? (params as any)?.code ?? (params as any)?.alliance ?? (params as any)?.tag ?? (params as any)?.id ?? "";
  const allianceCode = useMemo(() => upperCode(raw), [raw]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const canManageGuides = isAppAdmin || ["owner", "r5", "r4"].includes(String(role ?? "").toLowerCase());

  const [sections, setSections] = useState<AnyRow[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [posts, setPosts] = useState<AnyRow[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const selectedSection = useMemo(
    () => (sections || []).find((s: any) => String(s?.id) === String(selectedSectionId)),
    [sections, selectedSectionId]
  );

  const isSelectedReadOnly = Boolean(
    selectedSection?.[COL_SECTION_READONLY] ??
      selectedSection?.readonly ??
      selectedSection?.read_only ??
      selectedSection?.is_readonly ??
      false
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);

        // Best-effort: app admin check (works if your RPC is is_app_admin())
        try {
          const { data } = await supabase.rpc("is_app_admin");
          if (typeof data === "boolean") setIsAppAdmin(data);
        } catch {
          // ignore
        }

        // Determine alliance role from player_alliances via players(auth_user_id)
        if (uid && allianceCode) {
          const { data: p, error: pErr } = await supabase
            .from("players")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();

          if (!pErr && p?.id) {
            const { data: pa, error: paErr } = await supabase
              .from("player_alliances")
              .select("role")
              .eq("player_id", p.id)
              .eq("alliance_code", allianceCode)
              .maybeSingle();

            if (!paErr) setRole(pa?.role ?? null);
          }
        }
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allianceCode]);

  const loadSections = async () => {
    setErr(null);
    if (!allianceCode) return;

    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select("*")
      .eq(COL_ALLIANCE, allianceCode)
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      return;
    }

    const rows = (data ?? []) as AnyRow[];
    setSections(rows);

    if (!selectedSectionId && rows.length > 0) {
      setSelectedSectionId(String(rows[0]?.id));
    }
  };

  const loadPosts = async (sectionId: string) => {
    setErr(null);
    if (!sectionId) return;

    const { data, error } = await supabase
      .from(TABLE_POSTS)
      .select("*")
      .eq(COL_SECTION_ID_IN_POSTS, sectionId)
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      return;
    }

    setPosts((data ?? []) as AnyRow[]);
  };

  useEffect(() => {
    if (!allianceCode) return;
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  useEffect(() => {
    if (!selectedSectionId) return;
    loadPosts(selectedSectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  const createSection = async () => {
    if (!canManageGuides) return;
    const title = newSectionTitle.trim();
    if (!title) return;

    setErr(null);

    const payload: AnyRow = {};
    payload[COL_ALLIANCE] = allianceCode;
    payload[COL_SECTION_TITLE] = title;
    payload[COL_SECTION_READONLY] = false;

    const { error } = await supabase.from(TABLE_SECTIONS).insert(payload);
    if (error) {
      setErr(error.message);
      return;
    }

    setNewSectionTitle("");
    await loadSections();
  };

  const renameSelectedSection = async () => {
    if (!canManageGuides || !selectedSection) return;
    const current = String(
      selectedSection?.[COL_SECTION_TITLE] ?? selectedSection?.title ?? selectedSection?.name ?? ""
    );
    const next = window.prompt("Rename section:", current);
    if (!next) return;
    const title = next.trim();
    if (!title) return;

    setErr(null);

    const patch: AnyRow = {};
    patch[COL_SECTION_TITLE] = title;

    const { error } = await supabase.from(TABLE_SECTIONS).update(patch).eq("id", selectedSection.id);
    if (error) {
      setErr(error.message);
      return;
    }

    await loadSections();
  };

  const toggleSelectedSectionReadOnly = async () => {
    if (!canManageGuides || !selectedSection) return;

    setErr(null);

    const patch: AnyRow = {};
    patch[COL_SECTION_READONLY] = !isSelectedReadOnly;

    const { error } = await supabase.from(TABLE_SECTIONS).update(patch).eq("id", selectedSection.id);
    if (error) {
      setErr(error.message);
      return;
    }

    await loadSections();
  };

  const deleteSelectedSection = async () => {
    if (!canManageGuides || !selectedSection) return;
    if (!window.confirm("Delete this section and all posts inside it?")) return;

    setErr(null);

    // Best-effort: delete posts first (and images if your schema requires)
    await supabase.from(TABLE_POSTS).delete().eq(COL_SECTION_ID_IN_POSTS, selectedSection.id);
    const { error } = await supabase.from(TABLE_SECTIONS).delete().eq("id", selectedSection.id);
    if (error) {
      setErr(error.message);
      return;
    }

    setSelectedSectionId(null);
    setPosts([]);
    await loadSections();
  };

  const createPost = async () => {
    if (!selectedSectionId) return;
    if (isSelectedReadOnly && !canManageGuides) return;

    const body = newPostBody.trim();
    if (!body) return;

    setErr(null);

    const payload: AnyRow = {};
    payload[COL_SECTION_ID_IN_POSTS] = selectedSectionId;
    payload[COL_POST_BODY] = body;
    if (userId) payload[COL_POST_CREATED_BY] = userId;

    const { data, error } = await supabase.from(TABLE_POSTS).insert(payload).select("*").maybeSingle();
    if (error) {
      setErr(error.message);
      return;
    }

    // Optional image upload
    if (data?.id && uploadFiles.length > 0) {
      for (const f of uploadFiles) {
        try {
          const safeName = `${Date.now()}_${f.name}`.replace(/\s+/g, "_");
          const path = `${allianceCode}/${selectedSectionId}/${data.id}/${safeName}`;

          const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, f, { upsert: false });
          if (up.error) throw up.error;

          const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          const url = pub?.data?.publicUrl;

          if (url) {
            const imgRow: AnyRow = {};
            imgRow[COL_IMG_POST_ID] = data.id;
            imgRow[COL_IMG_URL] = url;

            // If images table doesn't exist / RLS blocks it, this will error—keep going.
            await supabase.from(TABLE_IMAGES).insert(imgRow);
          }
        } catch (e) {
          // ignore upload errors per-file; keep post
        }
      }
    }

    setNewPostBody("");
    setUploadFiles([]);
    await loadPosts(selectedSectionId);
  };

  const editPost = async (post: AnyRow) => {
    if (!canManageGuides || !post?.id) return;
    const current = String(post?.[COL_POST_BODY] ?? post?.content ?? post?.body ?? "");
    const next = window.prompt("Edit post:", current);
    if (next === null) return;

    const patch: AnyRow = {};
    patch[COL_POST_BODY] = next;

    const { error } = await supabase.from(TABLE_POSTS).update(patch).eq("id", post.id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (selectedSectionId) await loadPosts(selectedSectionId);
  };

  const deletePost = async (post: AnyRow) => {
    if (!canManageGuides || !post?.id) return;
    if (!window.confirm("Delete this post?")) return;

    // Best-effort: delete images rows first
    try { await supabase.from(TABLE_IMAGES).delete().eq(COL_IMG_POST_ID, post.id); } catch {}

    const { error } = await supabase.from(TABLE_POSTS).delete().eq("id", post.id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (selectedSectionId) await loadPosts(selectedSectionId);
  };

  if (loading) {
    return <div style={{ padding: 16 }}>Loading Guides…</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>📓 Alliance Guides</h2>
        <Link to={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ opacity: 0.85 }}>
          ← Back to Dashboard
        </Link>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* LEFT: sections */}
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <b>Sections</b>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              {canManageGuides ? "Manage" : "Read"}
            </span>
          </div>

          {canManageGuides ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title…"
                style={{ flex: 1, padding: 8, borderRadius: 10 }}
              />
              <button onClick={createSection} style={{ padding: "8px 10px", borderRadius: 10 }}>
                Add
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {(sections ?? []).map((s: any) => {
              const id = String(s?.id);
              const title = String(s?.[COL_SECTION_TITLE] ?? s?.title ?? s?.name ?? "Untitled");
              const ro = Boolean(s?.[COL_SECTION_READONLY] ?? s?.readonly ?? s?.read_only ?? s?.is_readonly ?? false);

              const active = id === String(selectedSectionId);
              return (
                <button
                  key={id}
                  onClick={() => setSelectedSectionId(id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontWeight: 600 }}>{title}</span>
                    <span style={{ opacity: 0.7, fontSize: 12 }}>{ro ? "Read-only" : "Discussion"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: posts */}
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>
                {selectedSection
                  ? String(selectedSection?.[COL_SECTION_TITLE] ?? selectedSection?.title ?? selectedSection?.name ?? "Section")
                  : "Select a section"}
              </b>
              {selectedSection ? (
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  Mode: {isSelectedReadOnly ? "Read-only" : "Discussion"}
                </div>
              ) : null}
            </div>

            {selectedSection && canManageGuides ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={renameSelectedSection} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Rename
                </button>
                <button onClick={toggleSelectedSectionReadOnly} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  {isSelectedReadOnly ? "Make Discussion" : "Make Read-only"}
                </button>
                <button onClick={deleteSelectedSection} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          {!selectedSection ? (
            <div style={{ marginTop: 14, opacity: 0.75 }}>Pick a section on the left.</div>
          ) : (
            <>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {(posts ?? []).map((p: any) => {
                  const id = String(p?.id);
                  const body = String(p?.[COL_POST_BODY] ?? p?.content ?? p?.body ?? "");
                  return (
                    <div
                      key={id}
                      style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}
                    >
                      <div style={{ whiteSpace: "pre-wrap" }}>{body}</div>

                      {canManageGuides ? (
                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                          <button onClick={() => editPost(p)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                            Edit
                          </button>
                          <button onClick={() => deletePost(p)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* New post */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
                <div style={{ opacity: 0.85, fontWeight: 600, marginBottom: 6 }}>
                  {isSelectedReadOnly && !canManageGuides ? "Read-only section" : "New post"}
                </div>

                <textarea
                  value={newPostBody}
                  onChange={(e) => setNewPostBody(e.target.value)}
                  placeholder={isSelectedReadOnly && !canManageGuides ? "Posting disabled…" : "Write something…"}
                  disabled={isSelectedReadOnly && !canManageGuides}
                  rows={4}
                  style={{ width: "100%", padding: 10, borderRadius: 12 }}
                />

                {canManageGuides ? (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                    />
                    <button
                      onClick={createPost}
                      disabled={!newPostBody.trim() || (!selectedSectionId)}
                      style={{ padding: "8px 12px", borderRadius: 10 }}
                    >
                      Post
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={createPost}
                      disabled={!newPostBody.trim() || (isSelectedReadOnly && !canManageGuides) || (!selectedSectionId)}
                      style={{ padding: "8px 12px", borderRadius: 10 }}
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
