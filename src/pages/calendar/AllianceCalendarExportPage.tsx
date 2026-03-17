import React, { useState } from "react";
import { useParams } from "react-router-dom";
import AlliancePageExportDiscordTools from "../../components/discord/AlliancePageExportDiscordTools";
import AllianceCalendarPage from "./AllianceCalendarPage";

export default function AllianceCalendarExportPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").trim().toUpperCase();

  const [exportDisplayUtc, setExportDisplayUtc] = useState<boolean>(() => {
    try {
      return localStorage.getItem("calendar.timeMode") === "utc";
    } catch {
      return false;
    }
  });

  const [discordNote, setDiscordNote] = useState("");

  return (
    <AlliancePageExportDiscordTools
      allianceCode={allianceCode}
      kind="calendar"
      title="Calendar"
      filenamePrefix="calendar"
      exportDisplayUtc={exportDisplayUtc}
      onExportDisplayUtcChange={setExportDisplayUtc}
      extraMessage={discordNote}
      onExtraMessageChange={setDiscordNote}
    >
      <AllianceCalendarPage
        forcedDisplayUtc={exportDisplayUtc}
        onForcedDisplayUtcChange={setExportDisplayUtc}
      />
    </AlliancePageExportDiscordTools>
  );
}
