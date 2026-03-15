import React from "react";
import { useParams } from "react-router-dom";
import AlliancePageExportDiscordTools from "../../components/discord/AlliancePageExportDiscordTools";
import AllianceCalendarPage from "./AllianceCalendarPage";

export default function AllianceCalendarExportPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").trim().toUpperCase();

  return (
    <AlliancePageExportDiscordTools
      allianceCode={allianceCode}
      kind="calendar"
      title="Calendar"
      filenamePrefix="calendar"
    >
      <AllianceCalendarPage />
    </AlliancePageExportDiscordTools>
  );
}
