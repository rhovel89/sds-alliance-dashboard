import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useParams } from "react-router-dom";
import { useAllianceGuideToolAccess } from "../../hooks/useAllianceGuideToolAccess";

export default function AllianceGuidesPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id ?? "").trim().toUpperCase();

  const { loading, canUseGuideTools, reason } = useAllianceGuideToolAccess(allianceCode);

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
            Checking guide tool access...
          </div>
        ) : canUseGuideTools ? (
          <GuideMediaUploader allianceCode={allianceCode} />
        ) : (
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
              Only Owner, R5, app admin, or assigned staff can upload/manage guides for {allianceCode}.
            </div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
              Access status: {reason}
            </div>
          </div>
        )}
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
