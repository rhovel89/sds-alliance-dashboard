import React, { useEffect, useMemo, useRef, useState } from "react";

export type CCModule = {
  key: string;
  label: string;
  hint?: string;
  to?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  modules?: Array<{ key: string; label: string; hint?: string }>;
  // accepts either the full module registry (with `to`) or the UI-only list above
  moduleRegistry?: CCModule[];
  activeModuleKey?: string;
  onSelectModule?: (key: string) => void;
  topRight?: React.ReactNode;
  chromeless?: boolean;
  children?: React.ReactNode;
};

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

function normalizeModules(modules?: Props["modules"], registry?: CCModule[]): CCModule[] {
  const reg = Array.isArray(registry) ? registry : [];
  const ui = Array.isArray(modules) ? modules : [];

  if (reg.length) return reg;
  return ui.map((m) => ({ key: m.key, label: m.label, hint: m.hint, to: undefined }));
}

export default function CommandCenterShell(props: Props) {
  const {
    title = "Command Center",
    subtitle = "",
    modules,
    moduleRegistry,
    activeModuleKey,
    onSelectModule,
    topRight,
    chromeless = false,
    children,
  } = props;

  const allModules = useMemo(() => normalizeModules(modules, moduleRegistry), [modules, moduleRegistry]);

  // -------- Command Palette (Ctrl+K) ----------
  const [palOpen, setPalOpen] = useState(false);
  const [palQ, setPalQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = (e.key || "").toLowerCase() === "k";
      const cmd = (e as any).metaKey === true;
      const ctrl = (e as any).ctrlKey === true;
      if ((cmd || ctrl) && isK) {
        e.preventDefault();
        setPalOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") setPalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const palItems = useMemo(() => {
    const q = s(palQ).trim().toLowerCase();
    const list = allModules.length
      ? allModules
      : [
          { key: "dash", label: "Dashboard", hint: "My dashboards hub", to: "/dashboard" },
          { key: "dossier", label: "Dossier", hint: "Identity + defaults", to: "/me/dossier" },
          { key: "state789", label: "State 789", hint: "War room hub", to: "/state/789" },
          { key: "owner", label: "Owner", hint: "Owner command", to: "/owner" },
        ];

    return list.filter((m) => {
      if (!q) return true;
      const hay = (s(m.label) + " " + s(m.hint) + " " + s(m.key) + " " + s(m.to)).toLowerCase();
      return hay.includes(q);
    });
  }, [palQ, allModules]);

  function goModule(m: CCModule) {
    try {
      setPalOpen(false);
      setPalQ("");
      if (onSelectModule) { onSelectModule(m.key); return; }
      if (m.to) { window.location.assign(m.to); return; }
    } catch {}
  }

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: chromeless ? 0 : 14,
    overflow: "visible", // critical: prevent crop
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: chromeless ? 0 : 12,
    overflow: "visible",
  };

  return (
    <div className="cc-shell" style={shellStyle} data-cc-shell>
      {/* Top Header */}
      {!chromeless ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: 0.2 }}>{title}</div>
            {subtitle ? <div style={{ opacity: 0.78, marginTop: 4, fontSize: 12 }}>{subtitle}</div> : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="zombie-btn" type="button" onClick={() => { setPalOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0); }}>
              Ctrl+K
            </button>
            {topRight ? topRight : null}
          </div>
        </div>
      ) : null}

      {/* Module bar */}
      {!chromeless && allModules.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {allModules.map((m) => {
            const active = activeModuleKey && m.key === activeModuleKey;
            return (
              <button
                key={m.key}
                className="zombie-btn"
                type="button"
                onClick={() => goModule(m)}
                style={{
                  opacity: active ? 1 : 0.86,
                  borderColor: active ? "rgba(176,18,27,0.55)" : undefined,
                }}
                title={m.hint || ""}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Content */}
      <div style={cardStyle}>
        <div style={{ minWidth: 0 }}>
          {children}
        </div>
      </div>

      {/* Command Palette Overlay */}
      {palOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setPalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 90,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 96vw)",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(10,10,10,0.92)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <input
                ref={inputRef}
                value={palQ}
                onChange={(e) => setPalQ(e.target.value)}
                placeholder="Type to search… (Esc to close)"
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.35)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ maxHeight: "52vh", overflow: "auto" }}>
              {palItems.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => goModule(m)}
                  className="zombie-btn"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "block",
                    borderRadius: 0,
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    padding: "12px 12px",
                    background: "transparent",
                    opacity: 0.95,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{m.label}</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                    {m.hint ? m.hint : (m.to ? m.to : m.key)}
                  </div>
                </button>
              ))}
              {!palItems.length ? <div style={{ padding: 14, opacity: 0.75 }}>No matches.</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
