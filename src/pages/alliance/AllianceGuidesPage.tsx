import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useAllianceGuideToolAccess } from "../../hooks/useAllianceGuideToolAccess";

type SectionRow = {
  id: string;
  title?: string | null;
  description?: string | null;
};

type EntryRow = {
  id: string;
  section_id: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function useGuideShareData(allianceCode: string) {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!allianceCode) {
        if (!alive) return;
        setSections([]);
        setEntries([]);
        setLoadError("");
        return;
      }

      setLoading(true);
      setLoadError("");

      const [secRes, entRes] = await Promise.all([
        supabase
          .from("guide_sections")
          .select("id,title,description")
          .eq("alliance_code", allianceCode),

        supabase
          .from("guide_section_entries")
          .select("id,section_id,title,created_at,updated_at")
          .eq("alliance_code", allianceCode),
      ]);

      if (!alive) return;

      if (secRes.error) {
        setLoadError(secRes.error.message || "Could not load guide sections.");
        setSections([]);
      } else {
        const nextSections = ((secRes.data ?? []) as SectionRow[]).slice().sort((a, b) =>
          String(a?.title ?? "").localeCompare(String(b?.title ?? ""))
        );
        setSections(nextSections);
      }

      if (entRes.error) {
        setLoadError((prev) => prev || entRes.error?.message || "Could not load guide pages.");
        setEntries([]);
      } else {
        const nextEntries = ((entRes.data ?? []) as EntryRow[]).slice().sort((a, b) => {
          const at = String(a?.title ?? "");
          const bt = String(b?.title ?? "");
          return at.localeCompare(bt);
        });
        setEntries(nextEntries);
      }

      setLoading(false);
    }

    void run();
    return () => {
      alive = false;
    };
  }, [allianceCode]);

  return { sections, entries, loading, loadError };
}

function GuideShareCard({ allianceCode }: { allianceCode: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { sections, entries, loading, loadError } = useGuideShareData(allianceCode);

  const selectedSectionId = String(searchParams.get("section") ?? "").trim();
  const selectedEntryId = String(searchParams.get("entry") ?? searchParams.get("page") ?? "").trim();

  const selectedSection = useMemo(
    () => sections.find((s) => String(s.id) === selectedSectionId) ?? null,
    [sections, selectedSectionId]
  );

  const selectedEntry = useMemo(
    () => entries.find((e) => String(e.id) === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  const shareMode: "guides" | "section" | "page" =
    selectedEntryId ? "page" : selectedSectionId ? "section" : "guides";

  const pageOptions = useMemo(() => {
    if (!selectedSectionId) return entries;
    return entries.filter((e) => String(e.section_id) === selectedSectionId);
  }, [entries, selectedSectionId]);

  function setTarget(nextSectionId: string, nextEntryId: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (nextSectionId) next.set("section", nextSectionId);
    else next.delete("section");

    if (nextEntryId) next.set("entry", nextEntryId);
    else {
      next.delete("entry");
      next.delete("page");
    }

    setSearchParams(next);
  }

  function onModeChange(mode: "guides" | "section" | "page") {
    if (mode === "guides") {
      setTarget("", "");
      return;
    }

    if (mode === "section") {
      const fallbackSectionId =
        selectedSectionId ||
        selectedEntry?.section_id ||
        (sections[0] ? String(sections[0].id) : "");
      setTarget(fallbackSectionId, "");
      return;
    }

    const firstEntry =
      selectedEntry ||
      (selectedSectionId ? pageOptions[0] : entries[0]) ||
      null;

    if (firstEntry) {
      setTarget(String(firstEntry.section_id), String(firstEntry.id));
      return;
    }

    const fallbackSectionId = selectedSectionId || (sections[0] ? String(sections[0].id) : "");
    setTarget(fallbackSectionId, "");
  }

  function onSectionChange(nextSectionId: string) {
    if (!nextSectionId) {
      setTarget("", "");
      return;
    }

    if (shareMode === "page") {
      const firstEntryInSection =
        entries.find((e) => String(e.section_id) === nextSectionId) ?? null;
      setTarget(nextSectionId, firstEntryInSection ? String(firstEntryInSection.id) : "");
      return;
    }

    setTarget(nextSectionId, "");
  }

  function onPageChange(nextEntryId: string) {
    const entry = entries.find((e) => String(e.id) === nextEntryId) ?? null;
    if (!entry) {
      setTarget(selectedSectionId, "");
      return;
    }
    setTarget(String(entry.section_id), String(entry.id));
  }

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedSectionId) params.set("section", selectedSectionId);
    if (selectedEntryId) params.set("entry", selectedEntryId);

    const qs = params.toString();
    const rel = `/dashboard/${encodeURIComponent(allianceCode)}/guides${qs ? `?${qs}` : ""}`;

    if (typeof window === "undefined") return rel;
    return `${window.location.origin}${rel}`;
  }, [allianceCode, selectedSectionId, selectedEntryId]);

  const shareTitle = selectedEntry
    ? String(selectedEntry.title || "Guide Page")
    : selectedSection
    ? String(selectedSection.title || "Guide Section")
    : `${allianceCode} Guides`;

  const discordPost =
    shareMode === "page"
      ? `📘 ${allianceCode} guide page: ${shareTitle}` + "\n" + shareUrl
      : shareMode === "section"
      ? `📚 ${allianceCode} guide section: ${shareTitle}` + "\n" + shareUrl
      : `📚 ${allianceCode} guides` + "\n" + shareUrl;

  async function copyText(text: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert(okMessage);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  async function copyDiscordAndOpen() {
    await copyText(discordPost, "Discord-ready guide post copied.");
    window.open("https://discord.com/channels/@me", "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        border: "1px solid rgba(120,180,255,0.22)",
        background: "rgba(120,180,255,0.06)",
        borderRadius: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 900 }}>Share a specific guide section or page to Discord</div>

      <div style={{ opacity: 0.82, fontSize: 12 }}>
        Pick exactly what you want to share, then copy the Discord post or open Discord.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.78 }}>Share target</span>
          <select
            value={shareMode}
            onChange={(e) => onModeChange(e.target.value as "guides" | "section" | "page")}
          >
            <option value="guides">All guides</option>
            <option value="section">Specific section</option>
            <option value="page">Specific page</option>
          </select>
        </label>

        {(shareMode === "section" || shareMode === "page") ? (
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.78 }}>Section</span>
            <select value={selectedSectionId} onChange={(e) => onSectionChange(e.target.value)}>
              <option value="">Choose a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {String(section.title || "Untitled Section")}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {shareMode === "page" ? (
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.78 }}>Page</span>
            <select
              value={selectedEntryId}
              onChange={(e) => onPageChange(e.target.value)}
              disabled={!pageOptions.length}
            >
              <option value="">{pageOptions.length ? "Choose a page" : "No pages in this section"}</option>
              {pageOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {String(entry.title || "Untitled Page")}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="zombie-btn"
          onClick={() => void copyText(shareUrl, "Guide link copied.")}
        >
          Copy link
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={() => void copyText(discordPost, "Discord-ready guide post copied.")}
        >
          Copy Discord post
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={() => void copyDiscordAndOpen()}
        >
          Share to Discord
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.78 }}>
        Now sharing: <b>{shareTitle}</b>
      </div>

      <div
        style={{
          fontSize: 12,
          opacity: 0.72,
          wordBreak: "break-all",
          lineHeight: 1.45,
        }}
      >
        {shareUrl}
      </div>

      {loading ? <div style={{ fontSize: 12, opacity: 0.72 }}>Loading sections and pages…</div> : null}
      {loadError ? <div style={{ fontSize: 12, color: "#ffb4b4" }}>{loadError}</div> : null}
    </div>
  );
}

export default function AllianceGuidesPage() {
  const params = useParams();
  const allianceCode = String(params.alliance_id ?? params.code ?? params.allianceCode ?? "").trim().toUpperCase();

  const {
    loading,
    signedIn,
    canCreateGuides,
    canManageAllGuides,
    reason,
  } = useAllianceGuideToolAccess(allianceCode);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <GuideShareCard allianceCode={allianceCode} />

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
        }}
      >
        {loading ? (
          <div
            className="zombie-card"
            style={{
              padding: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
            }}
          >
            Checking guide access...
          </div>
        ) : !signedIn ? (
          <div
            className="zombie-card"
            style={{
              padding: 12,
              border: "1px solid rgba(255,180,120,0.22)",
              background: "rgba(255,180,120,0.08)",
              borderRadius: 14,
            }}
          >
            <div style={{ fontWeight: 900 }}>Guide tools locked</div>
            <div style={{ opacity: 0.82, fontSize: 12, marginTop: 6 }}>
              Sign in to upload and manage your own guides.
            </div>
          </div>
        ) : canCreateGuides ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              className="zombie-card"
              style={{
                padding: 12,
                border: "1px solid rgba(120,255,120,0.20)",
                background: "rgba(120,255,120,0.06)",
                borderRadius: 14,
              }}
            >
              <div style={{ fontWeight: 900 }}>
                {canManageAllGuides ? "Guide manager access" : "Own-guide access"}
              </div>
              <div style={{ opacity: 0.82, fontSize: 12, marginTop: 6 }}>
                {canManageAllGuides
                  ? `You can manage all guides for ${allianceCode}.`
                  : `You can upload guides and edit/delete your own guides for ${allianceCode}.`}
              </div>
              <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
                Access status: {reason}
              </div>
            </div>

            <GuideMediaUploader allianceCode={allianceCode} />
          </div>
        ) : null}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
        }}
      >
        <AllianceGuidesCommandCenter />
      </div>
    </div>
  );
}