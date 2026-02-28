import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  alliance_id: string;
  date: any; // keep compatible with existing caller
  onSaved: () => void;
  onClose: () => void;
};

export default function EventModal({ alliance_id, date, onSaved, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [sendReminders, setSendReminders] = useState(true);

  // Per-event override: default ON (blank = use alliance default channel)
  const [useDefaultChannel, setUseDefaultChannel] = useState(true);
  const [discordChannelId, setDiscordChannelId] = useState("");

  const canOverride = useMemo(() => !useDefaultChannel, [useDefaultChannel]);

  async function save() {
    const t = title.trim();
    if (!t) return alert("Enter an event title.");

    const ch = discordChannelId.trim();

    // If override is enabled, validate channel id format
    if (canOverride && ch && !/^\d{10,25}$/.test(ch)) {
      return alert("Discord Channel ID must be numbers only (10–25 digits).");
    }

    const payload: Record<string, any> = {
      alliance_id,
      title: t,
      date, // keep existing behavior (do not rename)
      send_reminders: !!sendReminders,
      discord_channel_id: canOverride ? (ch || null) : null,
    };

    const { error } = await supabase.from("alliance_events").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="modal" style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 900 }}>Create Event</div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
      />

      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.95 }}>
        <input
          type="checkbox"
          checked={sendReminders}
          onChange={(e) => setSendReminders(e.target.checked)}
        />
        Send reminders (1h / 30m / 5m) via Discord
      </label>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Reminder Channel</div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={useDefaultChannel}
            onChange={(e) => {
              const v = e.target.checked;
              setUseDefaultChannel(v);
              if (v) setDiscordChannelId("");
            }}
          />
          Use alliance default reminder channel
        </label>

        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          If checked, this event will leave Channel ID blank and reminders will use the alliance default.
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={discordChannelId}
            onChange={(e) => setDiscordChannelId(e.target.value)}
            placeholder="Discord Channel ID (numbers)"
            disabled={!canOverride}
            style={{ width: 260, opacity: canOverride ? 1 : 0.6 }}
          />
          {canOverride ? (
            <button type="button" onClick={() => setDiscordChannelId("")}>Clear</button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
