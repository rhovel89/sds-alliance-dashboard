import React, { useEffect, useMemo, useState } from "react";

type TargetMode = "ALL" | "ALLIANCE";

type Draft = {
  version: 1;
  targetMode: TargetMode;
  allianceCode: string;
  roleToken: string;
  title: string;
  body: string;
  whenLocal: string; // datetime-local
  channelToken: string; // optional placeholder like #announcements
  template: string;
};

const KEY = "sad_owner_broadcast_draft_v1";

const ROLE_OPTIONS = [
  "@Leadership",
  "@R5",
  "@R4",
  "@Member",
  "@StateLeadership",
  "@StateMod",
  "(none)",
] as const;

const TEMPLATE_OPTIONS = [
  "Maintenance",
  "War Rally",
  "Reset Reminder",
  "Recruitment",
  "Custom",
] as const;

function nowUtcIso() {
  return new Date().toISOString();
}

function toUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && d.version === 1) return d;
    }
  } catch {}
  return {
    version: 1,
    targetMode: "ALLIANCE",
    allianceCode: "WOC",
    roleToken: "@Leadership",
    title: "",
    body: "",
    whenLocal: "",
    channelToken: "#announcements",
    template: "Custom",
  };
}

function saveDraft(d: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

function applyTemplate(kind: string): { title: string; body: string; roleToken: string } {
  if (kind === "Maintenance") {
    return {
      title: "Maintenance Notice",
      roleToken: "@Leadership",
      body: "Maintenance window is active. Please avoid critical actions until we confirm it's clear.",
    };
  }
  if (kind === "War Rally") {
    return {
      title: "War Rally",
      roleToken: "@R5",
      body: "Rally up. Post assignments, timing, and confirmations. Stay coordinated.",
    };
  }
  if (kind === "Reset Reminder") {
    return {
      title: "Reset Reminder",
      roleToken: "@R4",
      body: "Daily reset is approaching. Wrap tasks and prepare for the next cycle.",
    };
  }
  if (kind === "Recruitment") {
    return {
      title: "Recruitment",
      roleToken: "@Member",
      body: "Recruiting active players. Share your power, rally times, and expectations.",
    };
  }
  return { title: "", body: "", roleToken: "@Leadership" };
}

export function OwnerBroadcastModal(props: { open: boolean; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => loadDraft());

  useEffect(() => {
    if (!props.open) return;
    setD(loadDraft());
  }, [props.open]);

  useEffect(() => {
    saveDraft(d);
  }, [d]);

  const preview = useMemo(() => {
    const lines: string[] = [];

    const mode = d.targetMode;
    const alliance = (d.allianceCode || "").trim().toUpperCase();
    const who =
      mode === "ALL"
        ? "**TARGET: ALL ALLIANCES**"
        : alliance
        ? "**TARGET: " + alliance + "**"
        : "**TARGET: (MISSING ALLIANCE CODE)**";

    const role = d.roleToken === "(none)" ? "" : d.roleToken;

    lines.push("**🧟 OWNER BROADCAST**");
    lines.push(who);

    if (role) lines.push(role);

    const title = (d.title || "").trim();
    if (title) lines.push("**" + title + "**");

    if (d.channelToken && d.channelToken.trim()) {
      lines.push("Channel: " + d.channelToken.trim());
    }

    if (d.whenLocal && d.whenLocal.trim()) {
      const dt = new Date(d.whenLocal.trim());
      if (!isNaN(dt.getTime())) {
        const unix = toUnixSeconds(dt);
        lines.push("Time: <t:" + unix + ":F>  |  <t:" + unix + ":R>");
        lines.push("UTC: " + new Date(unix * 1000).toISOString());
      }
    }

    lines.push("UTC Now: " + nowUtcIso());
    lines.push("");

    const body = (d.body || "").trim();
    if (body) lines.push(body);

    lines.push("");
    lines.push("_Placeholders supported (UI-only):_");
    lines.push("- Roles: @Leadership @R5 @R4 @Member @StateLeadership @StateMod (and {{Leadership}} style)");
    lines.push("- Channels: #announcements, {{#announcements}}, {{channel:announcements}}");
    return lines.join("\n");
  }, [d]);

  async function copyText(txt: string) {
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied to clipboard.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  function setField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.70)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 16,
        overflow: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        className="zombie-card"
        style={{
          width: "min(980px, 100%)",
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>📣 Owner Broadcast (UI-only)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyText(preview)}>
              Copy Discord Text
            </button>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={() => copyText(JSON.stringify(d, null, 2))}
            >
              Copy Draft JSON
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={props.onClose}>
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target</div>
            <select
              className="zombie-input"
              value={d.targetMode}
              onChange={(e) => setField("targetMode", (e.target.value as TargetMode) || "ALLIANCE")}
              style={{ width: "100%", padding: "10px 12px" }}
            >
              <option value="ALL">All Alliances</option>
              <option value="ALLIANCE">Specific Alliance</option>
            </select>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Code</div>
            <input
              className="zombie-input"
              value={d.allianceCode}
              disabled={d.targetMode === "ALL"}
              onChange={(e) => setField("allianceCode", e.target.value.toUpperCase())}
              placeholder="WOC"
              style={{ width: "100%", padding: "10px 12px", opacity: d.targetMode === "ALL" ? 0.6 : 1 }}
            />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Template</div>
            <select
              className="zombie-input"
              value={d.template}
              onChange={(e) => {
                const v = e.target.value;
                setField("template", v);
                if (v !== "Custom") {
                  const t = applyTemplate(v);
                  setField("title", t.title);
                  setField("body", t.body);
                  setField("roleToken", t.roleToken);
                }
              }}
              style={{ width: "100%", padding: "10px 12px" }}
            >
              {TEMPLATE_OPTIONS.map((x) => (
                <option value={x} key={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Role token</div>
            <select
              className="zombie-input"
              value={d.roleToken}
              onChange={(e) => setField("roleToken", e.target.value)}
              style={{ width: "100%", padding: "10px 12px" }}
            >
              {ROLE_OPTIONS.map((x) => (
                <option value={x} key={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Channel token</div>
            <input
              className="zombie-input"
              value={d.channelToken}
              onChange={(e) => setField("channelToken", e.target.value)}
              placeholder="#announcements"
              style={{ width: "100%", padding: "10px 12px" }}
            />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>When (local → discord timestamps)</div>
            <input
              className="zombie-input"
              type="datetime-local"
              value={d.whenLocal}
              onChange={(e) => setField("whenLocal", e.target.value)}
              style={{ width: "100%", padding: "10px 12px" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
          <input
            className="zombie-input"
            value={d.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Message title…"
            style={{ width: "100%", padding: "10px 12px" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
          <textarea
            className="zombie-input"
            value={d.body}
            onChange={(e) => setField("body", e.target.value)}
            placeholder="Message body…"
            style={{ width: "100%", minHeight: 110, padding: "10px 12px" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Preview</div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 12,
              background: "rgba(0,0,0,0.22)",
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "auto",
              fontSize: 12,
              lineHeight: "16px",
            }}
          >
{preview}
          </pre>
        </div>
      </div>
    </div>
  );
}