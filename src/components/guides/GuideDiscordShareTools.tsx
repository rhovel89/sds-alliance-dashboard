import { useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

export default function GuideDiscordShareTools(props: { allianceCode: string }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  const allianceCode = String(props.allianceCode || "").trim().toUpperCase();

  const sectionId = firstNonEmpty([
    searchParams.get("section"),
    searchParams.get("sectionId"),
  ]);

  const pageId = firstNonEmpty([
    searchParams.get("page"),
    searchParams.get("pageId"),
    searchParams.get("entry"),
    searchParams.get("entryId"),
    searchParams.get("guide"),
    searchParams.get("guideId"),
  ]);

  const shareUrl = useMemo(() => {
    if (!allianceCode) return "";
    return `${window.location.origin}${location.pathname}${location.search}`;
  }, [allianceCode, location.pathname, location.search]);

  const targetLabel = useMemo(() => {
    if (pageId) return "specific page";
    if (sectionId) return "specific section";
    return "guides page";
  }, [pageId, sectionId]);

  const discordMessage = useMemo(() => {
    if (!shareUrl) return "";

    const lines: string[] = [];
    lines.push(`📚 **${allianceCode} ${targetLabel}**`);

    if (sectionId) lines.push(`Section ID: ${sectionId}`);
    if (pageId) lines.push(`Page ID: ${pageId}`);
    if (note.trim()) lines.push(note.trim());

    lines.push(shareUrl);
    return lines.join("\n");
  }, [allianceCode, targetLabel, sectionId, pageId, note, shareUrl]);

  async function copy(text: string, ok = "Copied ✅") {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(ok);
      window.setTimeout(() => setStatus(""), 2400);
    } catch {
      setStatus("Copy failed.");
      window.setTimeout(() => setStatus(""), 2400);
    }
  }

  function openDiscord() {
    if (!discordMessage) return;
    void copy(discordMessage, "Discord post copied ✅");
    window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
  }

  if (!allianceCode) return null;

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(120,180,255,0.18)",
        background: "rgba(120,180,255,0.05)",
        display: "grid",
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>Share to Discord</div>
        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
          This shares the <b>current URL</b>. Open the exact section or page first, then click <b>Copy Discord Post</b>.
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          opacity: 0.82,
          wordBreak: "break-all",
          padding: 10,
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {shareUrl || "Share URL unavailable"}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional Discord note..."
        rows={3}
        style={{
          width: "100%",
          resize: "vertical",
          minHeight: 74,
          borderRadius: 10,
          padding: 10,
          background: "rgba(255,255,255,0.04)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="zombie-btn"
          onClick={() => void copy(shareUrl, "Link copied ✅")}
          disabled={!shareUrl}
        >
          Copy Link
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={() => void copy(discordMessage, "Discord post copied ✅")}
          disabled={!discordMessage}
        >
          Copy Discord Post
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={openDiscord}
          disabled={!discordMessage}
        >
          Open Discord
        </button>
      </div>

      {status ? <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div> : null}
    </div>
  );
}