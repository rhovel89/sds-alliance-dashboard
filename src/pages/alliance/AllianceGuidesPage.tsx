import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useParams } from "react-router-dom";

export default function AllianceGuidesPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id ?? "");

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
        <GuideMediaUploader allianceCode={allianceCode} />
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
