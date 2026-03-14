import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Severity = "info" | "warning" | "critical";
type MentionTarget = "none" | "everyone" | "here" | "leadership" | "custom";

type Props = {
  stateCode: string;
  userId: string;
  title: string;
  body: string;
  discordChannelId?: string | null;
  initialSeverity?: Severity;
};

function localInputToIso(v: string) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function mentionPreview(target: MentionTarget, override: string) {
  if (target === "everyone") return "@everyone";
  if (target === "here") return "@here";
  if (target === "leadership") return "@leadership";
  if (target === "custom") return String(override || "").trim();
  return "No mention";
}

export default function StateScheduledAlertControls(props: Props) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [severity, setSeverity] = useState<Severity>(props.initialSeverity ?? "info");
  const [mentionTarget, setMentionTarget] = useState<MentionTarget>("none");
  const [mentionOverride, setMentionOverride] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSeverity(props.initialSeverity ?? "info");
  }, [props.initialSeverity]);

  const canSchedule = useMemo(() => {
    return (
      !!props.userId &&
      !!String(props.title || "").trim() &&
      !!String(props.body || "").trim() &&
      !!scheduledFor
    );
  }, [props.userId, props.title, props.body, scheduledFor]);

  async function scheduleAlert() {
    if (!canSchedule) return;

    const whenIso = localInputToIso(scheduledFor);
    if (!whenIso) {
      setStatus("Choose a valid date/time.");
      return;
    }

    setSaving(true);
    setStatus("Scheduling…");

    const ins = await supabase.from("scheduled_state_alerts").insert({
      state_code: String(props.stateCode || "789"),
      title: String(props.title || "").trim(),
      body: String(props.body || "").trim(),
      severity,
      scheduled_for: whenIso,
      mention_target: mentionTarget,
      mention_override:
        mentionTarget === "custom" ? String(mentionOverride || "").trim() : null,
      discord_channel_id: String(props.discordChannelId || "").trim() || null,
      created_by: props.userId,
      dispatch_to_discord: true,
      dispatch_to_state_alerts: true,
      status: "scheduled",
    });

    if (ins.error) {
      setStatus(ins.error.message);
      setSaving(false);
      return;
    }

    setStatus("Scheduled ✅");
    setScheduledFor("");
    setMentionTarget("none");
    setMentionOverride("");
    setSaving(false);
    window.setTimeout(() => setStatus(""), 1500);
  }

  return (
    <div
      className="zombie-card"
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,120,120,0.14)",
        background: "linear-gradient(180deg, rgba(85,0,0,0.16), rgba(0,0,0,0.18))",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16 }}>⏱️ Schedule alert for later</div>
      <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4 }}>
        Choose the day/time, severity, and mention target. When due, the scheduler will post it and queue Discord.
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Post on</div>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Severity</div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            style={{ width: "100%" }}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Mention target</div>
          <select
            value={mentionTarget}
            onChange={(e) => setMentionTarget(e.target.value as MentionTarget)}
            style={{ width: "100%" }}
          >
            <option value="none">No mention</option>
            <option value="everyone">@everyone</option>
            <option value="here">@here</option>
            <option value="leadership">@leadership</option>
            <option value="custom">Custom mention text</option>
          </select>
        </div>

        {mentionTarget === "custom" ? (
          <div>
            <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Custom mention</div>
            <input
              value={mentionOverride}
              onChange={(e) => setMentionOverride(e.target.value)}
              placeholder='Example: <@&123456789012345678>'
              style={{ width: "100%" }}
            />
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
        Mention preview: <b>{mentionPreview(mentionTarget, mentionOverride)}</b>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void scheduleAlert()}
          disabled={!canSchedule || saving}
          style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
        >
          {saving ? "Scheduling…" : "Schedule alert"}
        </button>

        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>
    </div>
  );
}