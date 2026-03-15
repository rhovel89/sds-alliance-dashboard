import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Props = {
  stateCode: string;
  userId: string;
  title: string;
  body: string;
  discordChannelId?: string | null;
};

type Severity = "info" | "warning" | "critical";
type MentionTarget = "none" | "everyone" | "here" | "leadership" | "custom";

type ScheduledRow = {
  id: string;
  title: string;
  body: string | null;
  severity: Severity;
  scheduled_for: string;
  status: string | null;
  created_at?: string | null;
  discord_channel_id?: string | null;
  mention_target?: MentionTarget | null;
  dispatch_to_discord?: boolean | null;
  dispatch_to_state_alerts?: boolean | null;
};

function localInputToIso(v: string) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function badgeStyle(status: string | null | undefined): React.CSSProperties {
  const s = String(status || "").toLowerCase();

  if (s === "scheduled") {
    return {
      border: "1px solid rgba(120,180,255,0.35)",
      background: "rgba(120,180,255,0.10)",
      color: "rgba(220,235,255,0.98)",
    };
  }

  if (s === "sent" || s === "completed") {
    return {
      border: "1px solid rgba(120,255,120,0.35)",
      background: "rgba(120,255,120,0.10)",
      color: "rgba(220,255,220,0.98)",
    };
  }

  if (s === "cancelled" || s === "canceled") {
    return {
      border: "1px solid rgba(255,180,120,0.35)",
      background: "rgba(255,180,120,0.10)",
      color: "rgba(255,235,220,0.98)",
    };
  }

  if (s === "failed" || s === "error") {
    return {
      border: "1px solid rgba(255,120,120,0.35)",
      background: "rgba(255,120,120,0.10)",
      color: "rgba(255,220,220,0.98)",
    };
  }

  return {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.92)",
  };
}

export default function StateScheduledAlertControls(props: Props) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [mentionTarget, setMentionTarget] = useState<MentionTarget>("none");
  const [mentionOverride, setMentionOverride] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [scheduledRows, setScheduledRows] = useState<ScheduledRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const canSchedule = useMemo(() => {
    return !!props.userId && !!String(props.title || "").trim() && !!scheduledFor;
  }, [props.userId, props.title, scheduledFor]);

  async function loadScheduled() {
    if (!props.userId) {
      setScheduledRows([]);
      return;
    }

    setListLoading(true);

    const res = await supabase
      .from("scheduled_state_alerts")
      .select(
        "id,title,body,severity,scheduled_for,status,created_at,discord_channel_id,mention_target,dispatch_to_discord,dispatch_to_state_alerts"
      )
      .eq("state_code", String(props.stateCode || "789"))
      .eq("created_by", props.userId)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (res.error) {
      setStatus(res.error.message);
      setListLoading(false);
      return;
    }

    setScheduledRows((res.data ?? []) as ScheduledRow[]);
    setListLoading(false);
  }

  useEffect(() => {
    void loadScheduled();
  }, [props.stateCode, props.userId]);

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
      body: String(props.body || ""),
      severity,
      scheduled_for: whenIso,
      mention_target: mentionTarget,
      mention_override: mentionTarget === "custom" ? String(mentionOverride || "").trim() : null,
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
    await loadScheduled();
    window.setTimeout(() => setStatus(""), 1500);
  }

  async function cancelScheduled(id: string) {
    if (!id || !props.userId) return;

    setStatus("Cancelling…");

    const up = await supabase
      .from("scheduled_state_alerts")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("created_by", props.userId);

    if (up.error) {
      setStatus(up.error.message);
      return;
    }

    setStatus("Cancelled ✅");
    await loadScheduled();
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function deleteScheduled(id: string) {
    if (!id || !props.userId) return;
    const ok = window.confirm("Delete this scheduled alert?");
    if (!ok) return;

    setStatus("Deleting…");

    const del = await supabase
      .from("scheduled_state_alerts")
      .delete()
      .eq("id", id)
      .eq("created_by", props.userId);

    if (del.error) {
      setStatus(del.error.message);
      return;
    }

    setStatus("Deleted ✅");
    await loadScheduled();
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div
      className="zombie-card"
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,120,120,0.14)",
        background: "linear-gradient(180deg, rgba(85,0,0,0.16), rgba(0,0,0,0.18))",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16 }}>⏱️ Schedule alert for later</div>
      <div style={{ opacity: 0.84, fontSize: 12, marginTop: 4 }}>
        Pick the day/time, severity, and mention target. When due, the scheduler will post it and queue Discord.
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
          <div style={{ opacity: 0.82, fontSize: 12, marginBottom: 6 }}>Post on</div>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div style={{ opacity: 0.82, fontSize: 12, marginBottom: 6 }}>Severity</div>
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
          <div style={{ opacity: 0.82, fontSize: 12, marginBottom: 6 }}>Mention target</div>
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
            <div style={{ opacity: 0.82, fontSize: 12, marginBottom: 6 }}>Custom mention</div>
            <input
              value={mentionOverride}
              onChange={(e) => setMentionOverride(e.target.value)}
              placeholder='Example: <@&123456789012345678>'
              style={{ width: "100%" }}
            />
          </div>
        ) : null}
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

        <button
          type="button"
          onClick={() => void loadScheduled()}
          disabled={listLoading}
          style={{ padding: "10px 14px", borderRadius: 12 }}
        >
          {listLoading ? "Refreshing…" : "Refresh scheduled"}
        </button>

        <div style={{ opacity: 0.86, fontSize: 12 }}>{status}</div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Scheduled alerts</div>
          <div style={{ opacity: 0.74, fontSize: 12 }}>
            {listLoading ? "Loading…" : `${scheduledRows.length} found`}
          </div>
        </div>

        {scheduledRows.length === 0 ? (
          <div style={{ opacity: 0.72, fontSize: 13 }}>
            No scheduled alerts yet.
          </div>
        ) : (
          scheduledRows.map((row) => {
            const isScheduled = String(row.status || "").toLowerCase() === "scheduled";

            return (
              <div
                key={row.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(0,0,0,0.18)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>
                      [{String(row.severity || "").toUpperCase()}] {String(row.title || "(untitled)")}
                    </div>
                    <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4 }}>
                      Scheduled: {fmtDate(row.scheduled_for)} • Created: {fmtDate(row.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      ...badgeStyle(row.status),
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    {String(row.status || "unknown")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", opacity: 0.84, fontSize: 12 }}>
                  <div>Mention: {String(row.mention_target || "none")}</div>
                  <div>Discord: {row.dispatch_to_discord ? "yes" : "no"}</div>
                  <div>State alerts: {row.dispatch_to_state_alerts ? "yes" : "no"}</div>
                  <div>Channel: {String(row.discord_channel_id || "default")}</div>
                </div>

                {String(row.body || "").trim() ? (
                  <div style={{ whiteSpace: "pre-wrap", opacity: 0.92, fontSize: 13 }}>
                    {String(row.body || "").slice(0, 220)}
                    {String(row.body || "").length > 220 ? "…" : ""}
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void cancelScheduled(row.id)}
                    disabled={!isScheduled}
                    style={{ padding: "8px 12px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteScheduled(row.id)}
                    style={{ padding: "8px 12px", borderRadius: 10 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
