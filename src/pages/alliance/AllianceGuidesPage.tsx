import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useParams } from "react-router-dom";

export default function AllianceGuidesPage() {
  // alliance_id param is used as alliance code in your current URLs (example: /dashboard/WOC/guides)
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id ?? "");

  return <AllianceGuidesCommandCenter />;
}

