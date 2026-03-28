import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function GuideDiscordShareTools(props: { allianceCode: string }) {
  const [searchParams] = useSearchParams();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  const allianceCode = String(props.allianceCode ?? "").trim().toUpperCase();
  const sectionId = String(searchParams.get("section") || "").trim();
  const entryId = String(searchParams.get("entry") || "").trim();

  const shareUrl = useMemo(() => {
    if (!allianceCode) return "";
    const base = `${window.location.origin}/dashboard/${encodeURIComponent(allianceCode)}/guides`;
    const qs = new URLSearchParams();
    if (sectionId) qs.set("section", sectionId);
    if (entryId) qs.set("entry", entryId);
    const suffix = qs.toString();
    return suffix ? `${base}?${suffix}` : base;
  }, [allianceCode, sectionId, entryId]);

  const shareTitle = useMemo(() => {
    if (entryId) return `Guide entry for ${allianceCode}`;
    if (sectionId) return `Guide section for ${allianceCode}`;
    return `Guides page for ${allianceCode}`;
  }, [allianceCode, sectionId, entryId]);

  const discordMessage = useMemo(() => {
    if (!shareUrl) return "";
    const lines: string[] = [];

    if (entryId) {
      lines.push(`📘 **${allianceCode} Guide Entry**`);
    } else if (sectionId) {
      lines.push(`📚 **${allianceCode} Guide Section**`);
    } else {
      lines.push(`📓 **${allianceCode} Guides Page**`);
    }

    if (note.trim()) {
      lines.push(note.trim());
    }

    lines.push(shareUrl);
    return lines.join("\n");
  }, [allianceCode, entryId, sectionId, note, shareUrl]);

  async function copy(text: string, ok = "Copied ✅") {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(ok);
      window.setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("Copy failed.");
      window.setTimeout(() => setStatus(""), 2500);
    }
  }

  async function nativeShare() {
    if (!shareUrl) return;
    try {
      const nav = navigator as any;
      if (nav.share) {
        await nav.share({
          title: shareTitle,
          text: note.trim() || shareTitle,
          url: shareUrl,
        });
        setStatus("Shared ✅");
        window.setTimeout(() => setStatus(""), 2500);
      } else {
        await copy(discordMessage || shareUrl, "Copied share text ✅");
      }
    } catch {
      // user cancelled or share unavailable
    }
  }

  function openDiscord() {
    if (!discordMessage) return;
    void copy(discordMessage, "Discord message copied ✅");
    window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
  }

  if (!allianceCode) return null;

  const targetText = entryId
    ? "Currently sharing this guide entry"
    : sectionId
    ? "Currently sharing this guide section"
    : "Currently sharing the main guides page";

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
        <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4 }}>
          {targetText}. Open a section first if you want to share a specific section.
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
          onClick={() => void copy(discordMessage, "Discord message copied ✅")}
          disabled={!discordMessage}
        >
          Copy Discord Message
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={openDiscord}
          disabled={!discordMessage}
        >
          Open Discord
        </button>

        <button
          type="button"
          className="zombie-btn"
          onClick={() => void nativeShare()}
          disabled={!shareUrl}
        >
          Share…
        </button>
      </div>

      {status ? (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}