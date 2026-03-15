import React from "react";
import { useParams } from "react-router-dom";
import AlliancePageExportDiscordTools from "../../components/discord/AlliancePageExportDiscordTools";
import AllianceGuidesPage from "./AllianceGuidesPage";

export default function AllianceGuidesExportPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").trim().toUpperCase();

  return (
    <AlliancePageExportDiscordTools
      allianceCode={allianceCode}
      kind="guides"
      title="Guides"
      filenamePrefix="guides"
    >
      <AllianceGuidesPage />
    </AlliancePageExportDiscordTools>
  );
}
