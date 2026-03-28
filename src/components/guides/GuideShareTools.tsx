import { useEffect, useMemo, useState } from "react";
import supabase from "../../lib/supabaseClient";

type SectionRow = {
  id: string;
  title: string;
  description?: string | null;
};

type EntryRow = {
  id: string;
  title: string;
  section_id: string;
};

export default function GuideShareTools({ allianceCode }: { allianceCode: string }) {
  const code = useMemo(() => String(allianceCode ?? "").trim().toUpperCase(), [allianceCode]);

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [status, setStatus] = useState("");
  const [lastUrl, setLastUrl] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!code) {
        setSections([]);
        setSectionId("");
        return;
      }

      setStatus("Loading share targets…");

      const res = await supabase
        .from("guide_sections")
        .select("id,title,description")
        .eq("alliance_code", code)
        .order("title", { ascending: true });

      if (!alive) return;

      if (res.error) {
        setStatus(res.error.message);
        setSections([]);
        setSectionId("");
        return;
      }

      const next = (res.data ?? []) as SectionRow[];
      setSections(next);
      setSectionId((prev) => prev || String(next[0]?.id ?? ""));
      setStatus(next.length ? "" : "No guide sections found to share.");
    })();

    return () => {
      alive = false;
    };
  }, [code]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!code || !sectionId) {
        setEntries([]);
        setEntryId("");
        return;
      }

      const res = await supabase
        .from("guide_section_entries")
        .select("id,title,section_id")
        .eq("alliance_code", code)
        .eq("section_id", sectionId)
        .order("title", { ascending: true });

      if (!alive) return;

      if (res.error) {
        setStatus(res.error.message);
        setEntries([]);
        setEntryId("");
        return;
      }

      const next = (res.data ?? []) as EntryRow[];
      setEntries(next);
      setEntryId((prev) => (next.some((x) => String(x.id) === prev) ? prev : String(next[0]?.id ?? "")));
    })();

    return () => {
      alive = false;
    };
  }, [code, sectionId]);

  async function copyText(value: string, okMessage: string) {
    await navigator.clipboard.writeText(value);
    setLastUrl(value);
    alert(okMessage);
  }

  function internalSectionUrl() {
    return `${window.location.origin}/dashboard/${encodeURIComponent(code)}/guides?section=${encodeURIComponent(sectionId)}`;
  }

  async function ensureShareLink(targetType: "section" | "entry", targetId: string) {
    const existing = await supabase
      .from("guide_share_links")
      .select("share_token")
      .eq("alliance_code", code)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.error) throw existing.error;

    const token = existing.data?.share_token;
    if (token) {
      return `${window.location.origin}/shared/guides/${token}`;
    }

    const ins = await supabase
      .from("guide_share_links")
      .insert({
        alliance_code: code,
        target_type: targetType,
        target_id: targetId,
      })
      .select("share_token")
      .single();

    if (ins.error) throw ins.error;

    return `${window.location.origin}/shared/guides/${ins.data.share_token}`;
  }

  async function copyInternalSectionLink() {
    if (!sectionId) {
      alert("Select a section first.");
      return;
    }
    await copyText(internalSectionUrl(), "Internal section link copied ✅");
  }

  async function copyPublicSectionLink() {
    if (!sectionId) {
      alert("Select a section first.");
      return;
    }
    try {
      setStatus("Creating public section link…");
      const url = await ensureShareLink("section", sectionId);
      await copyText(url, "Public section link copied ✅");
      setStatus("");
    } catch (e: any) {
      setStatus(e?.message || "Could not create share link.");
      alert(e?.message || "Could not create share link.");
    }
  }

  async function copyPublicEntryLink() {
    if (!entryId) {
      alert("Select a page first.");
      return;
    }
    try {
      setStatus("Creating public page link…");
      const url = await ensureShareLink("entry", entryId);
      await copyText(url, "Public page link copied ✅");
      setStatus("");
    } catch (e: any) {
      setStatus(e?.message || "Could not create share link.");
      alert(e?.message || "Could not create share link.");
    }
  }

  async function revokeLinks(targetType: "section" | "entry", targetId: string) {
    if (!targetId) {
      alert("Select a target first.");
      return;
    }

    const ok = confirm(`Revoke active ${targetType} share links?`);
    if (!ok) return;

    const upd = await supabase
      .from("guide_share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("alliance_code", code)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .is("revoked_at", null);

    if (upd.error) {
      setStatus(upd.error.message);
      alert(upd.error.message);
      return;
    }

    setStatus(`Revoked active ${targetType} share links ✅`);
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>Guide sharing</div>
        <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4 }}>
          Share one section or one page without exposing the whole guide tool.
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Section</label>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">Select a section…</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Page</label>
        <select value={entryId} onChange={(e) => setEntryId(e.target.value)} disabled={!sectionId}>
          <option value="">Select a page…</option>
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="zombie-btn" onClick={() => void copyInternalSectionLink()} disabled={!sectionId}>
          Copy internal section link
        </button>

        <button type="button" className="zombie-btn" onClick={() => void copyPublicSectionLink()} disabled={!sectionId}>
          Copy public section link
        </button>

        <button type="button" className="zombie-btn" onClick={() => void copyPublicEntryLink()} disabled={!entryId}>
          Copy public page link
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="zombie-btn" onClick={() => void revokeLinks("section", sectionId)} disabled={!sectionId}>
          Revoke section public links
        </button>

        <button type="button" className="zombie-btn" onClick={() => void revokeLinks("entry", entryId)} disabled={!entryId}>
          Revoke page public links
        </button>
      </div>

      {status ? <div style={{ opacity: 0.82, fontSize: 12 }}>{status}</div> : null}

      {lastUrl ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Last generated link</div>
          <code style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{lastUrl}</code>
        </div>
      ) : null}
    </div>
  );
}