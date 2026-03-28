import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useParams, useSearchParams } from "react-router-dom";
import { useAllianceGuideToolAccess } from "../../hooks/useAllianceGuideToolAccess";

function GuideShareCard({ allianceCode }: { allianceCode: string }) {
  const [searchParams] = useSearchParams();

  const sectionId = String(searchParams.get("section") ?? "").trim();
  const entryId = String(searchParams.get("entry") ?? searchParams.get("page") ?? "").trim();

  const shareKind = entryId ? "page" : sectionId ? "section" : "guides";

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/${encodeURIComponent(allianceCode)}/guides${window.location.search || ""}`
      : `/dashboard/${encodeURIComponent(allianceCode)}/guides`;

  const discordPost =
    shareKind === "page"
      ? `📘 ${allianceCode} guide page` + "\n" + shareUrl
      : shareKind === "section"
      ? `📚 ${allianceCode} guide section` + "\n" + shareUrl
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
      <div style={{ fontWeight: 900 }}>
        Share this {shareKind} to Discord
      </div>

      <div style={{ opacity: 0.82, fontSize: 12 }}>
        Open the exact guide page or section you want, then use these buttons.
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
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