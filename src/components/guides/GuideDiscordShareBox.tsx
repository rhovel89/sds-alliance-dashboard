import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type SectionRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  alliance_code?: string | null;
};

type EntryRow = {
  id: string;
  section_id: string;
  title?: string | null;
  body?: string | null;
  alliance_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  allianceCode: string;
};

function firstNonEmptyString(values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s && /^https?:\/\//i.test(s)) return s;
  }
  return "";
}

async function tryLoadGuidesWebhook(allianceCode: string): Promise<string> {
  const tableCandidates: Array<{ table: string; matchCols: string[]; urlCols: string[] }> = [
    {
      table: "alliance_discord_webhooks",
      matchCols: ["alliance_code"],
      urlCols: ["guides", "guides_webhook", "guides_url", "webhook_guides", "guide_webhook", "guide_url"],
    },
    {
      table: "discord_webhooks",
      matchCols: ["alliance_code"],
      urlCols: ["guides", "guides_webhook", "guides_url", "webhook_guides", "guide_webhook", "guide_url"],
    },
    {
      table: "alliance_webhooks",
      matchCols: ["alliance_code"],
      urlCols: ["guides", "guides_webhook", "guides_url", "webhook_guides", "guide_webhook", "guide_url"],
    },
    {
      table: "alliance_settings",
      matchCols: ["alliance_code"],
      urlCols: ["guides_webhook", "guides_url", "guide_webhook", "guide_url"],
    },
  ];

  for (const candidate of tableCandidates) {
    const selectCols = Array.from(new Set([...candidate.matchCols, ...candidate.urlCols])).join(", ");
    const res = await supabase
      .from(candidate.table)
      .select(selectCols)
      .eq(candidate.matchCols[0], allianceCode)
      .limit(1)
      .maybeSingle();

    if (res.error || !res.data) continue;

    const row = res.data as Record<string, unknown>;
    const webhook = firstNonEmptyString(candidate.urlCols.map((c) => row[c]));
    if (webhook) return webhook;
  }

  return "";
}

export default function GuideDiscordShareBox({ allianceCode }: Props) {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [mode, setMode] = useState<"page" | "section" | "entry">("page");
  const [sectionId, setSectionId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;

    async function load() {
      if (!allianceCode) return;
      setLoading(true);
      setStatus("");

      const [sectionsRes, entriesRes, webhook] = await Promise.all([
        supabase
          .from("guide_sections")
          .select("id, title, description, alliance_code")
          .eq("alliance_code", allianceCode)
          .order("title", { ascending: true }),
        supabase
          .from("guide_section_entries")
          .select("id, section_id, title, body, alliance_code, created_at, updated_at")
          .eq("alliance_code", allianceCode)
          .order("updated_at", { ascending: false }),
        tryLoadGuidesWebhook(allianceCode),
      ]);

      if (!live) return;

      if (!sectionsRes.error) setSections((sectionsRes.data ?? []) as SectionRow[]);
      if (!entriesRes.error) setEntries((entriesRes.data ?? []) as EntryRow[]);
      setWebhookUrl(webhook || "");

      if (sectionsRes.error && entriesRes.error) {
        setStatus("Could not load guides data for Discord sharing.");
      } else if (!webhook) {
        setStatus("No saved Guides webhook was found. Paste a Discord webhook URL below, or configure one on your Discord Webhooks page.");
      }

      setLoading(false);
    }

    void load();
    return () => {
      live = false;
    };
  }, [allianceCode]);

  const entriesForSection = useMemo(() => {
    if (!sectionId) return [];
    return entries.filter((e) => String(e.section_id) === String(sectionId));
  }, [entries, sectionId]);

  useEffect(() => {
    if (mode === "section" && !sectionId && sections.length > 0) {
      setSectionId(String(sections[0].id));
    }
    if (mode === "entry") {
      if (!sectionId && sections.length > 0) {
        const firstSectionId = String(sections[0].id);
        setSectionId(firstSectionId);
      }
    }
  }, [mode, sectionId, sections]);

  useEffect(() => {
    if (mode === "entry") {
      const filtered = entriesForSection;
      if (!filtered.length) {
        setEntryId("");
      } else if (!filtered.some((e) => String(e.id) === String(entryId))) {
        setEntryId(String(filtered[0].id));
      }
    } else {
      setEntryId("");
    }
  }, [mode, entriesForSection, entryId]);

  const selectedSection = useMemo(
    () => sections.find((s) => String(s.id) === String(sectionId)) ?? null,
    [sections, sectionId]
  );

  const selectedEntry = useMemo(
    () => entries.find((e) => String(e.id) === String(entryId)) ?? null,
    [entries, entryId]
  );

  const targetUrl = useMemo(() => {
    const base = `${window.location.origin}/dashboard/${encodeURIComponent(allianceCode)}/guides`;

    if (mode === "page") return base;
    if (mode === "section") return `${base}?section=${encodeURIComponent(sectionId)}`;
    return `${base}?section=${encodeURIComponent(sectionId)}&entry=${encodeURIComponent(entryId)}`;
  }, [allianceCode, mode, sectionId, entryId]);

  const shareTitle = useMemo(() => {
    if (mode === "page") return `${allianceCode} Guides`;
    if (mode === "section") return selectedSection?.title?.trim() || "Guide Section";
    return selectedEntry?.title?.trim() || "Guide Entry";
  }, [allianceCode, mode, selectedSection, selectedEntry]);

  const shareSummary = useMemo(() => {
    if (mode === "page") {
      return `Open the full ${allianceCode} guides page.`;
    }
    if (mode === "section") {
      return selectedSection?.description?.trim() || `Open the ${shareTitle} section.`;
    }
    return `Open the ${shareTitle} entry.`;
  }, [allianceCode, mode, selectedSection, shareTitle]);

  async function sendToDiscord() {
    const hook = String(webhookUrl ?? "").trim();

    if (!allianceCode) {
      setStatus("Missing alliance code.");
      return;
    }
    if (!hook) {
      setStatus("Missing Discord webhook URL.");
      return;
    }
    if (mode === "section" && !sectionId) {
      setStatus("Pick a section first.");
      return;
    }
    if (mode === "entry" && (!sectionId || !entryId)) {
      setStatus("Pick a section and entry first.");
      return;
    }

    const content =
      `📚 **${shareTitle}**\n` +
      `${shareSummary}\n` +
      `${targetUrl}`;

    setSending(true);
    setStatus("Sending to Discord…");

    try {
      const res = await fetch(hook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Discord webhook failed (${res.status})`);
      }

      setStatus("Sent to Discord ✅");
    } catch (err: any) {
      setStatus(err?.message || "Could not send to Discord.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>Send guides to Discord</div>
        <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4 }}>
          Pick the exact page, section, or entry you want to send.
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>What to send</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "page" | "section" | "entry")}
            className="zombie-input"
          >
            <option value="page">Whole guides page</option>
            <option value="section">Specific section</option>
            <option value="entry">Specific entry/page</option>
          </select>
        </label>

        {(mode === "section" || mode === "entry") ? (
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Section</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="zombie-input"
            >
              {sections.length === 0 ? <option value="">No sections found</option> : null}
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.title ?? "Untitled section")}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "entry" ? (
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Entry / page</span>
            <select
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
              className="zombie-input"
            >
              {entriesForSection.length === 0 ? <option value="">No entries found</option> : null}
              {entriesForSection.map((e) => (
                <option key={e.id} value={e.id}>
                  {String(e.title ?? "Untitled entry")}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Guides Discord webhook</span>
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="Paste Discord webhook URL here if not auto-loaded"
          className="zombie-input"
        />
      </label>

      <div
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.15)",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ fontWeight: 800 }}>{shareTitle}</div>
        <div style={{ opacity: 0.82, fontSize: 12 }}>{shareSummary}</div>
        <div style={{ opacity: 0.72, fontSize: 12, wordBreak: "break-all" }}>{targetUrl}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="zombie-btn"
          onClick={() => void sendToDiscord()}
          disabled={sending || loading}
        >
          {sending ? "Sending…" : "Send to Discord"}
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={() => navigator.clipboard.writeText(targetUrl)}
        >
          Copy link
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: status ? 0.9 : 0.7 }}>
        {status || "Ready."}
      </div>
    </div>
  );
}