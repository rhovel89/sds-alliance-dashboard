import React, { useEffect, useState } from "react";
import "../../styles/commandCenter.css";
import CommandPalette from "./CommandPalette";
import CommandPaletteHost from "./CommandPaletteHost";

export type CommandCenterModule = {
  key: string;
  label: string;
  hint?: string;
};

export function CommandCenterShell(props: {
  title: string;
  subtitle?: string;
  modules?: CommandCenterModule[];
  activeModuleKey?: string;
  onSelectModule?: (key: string) => void;
  topRight?: React.ReactNode;
  children: React.ReactNode;
  chromeless?: boolean;
  enableCommandPalette?: boolean;
}) {
  if ((props as any).chromeless) return <>{(props as any).children}</>;
  const {
    title,
    subtitle,
    modules,
    activeModuleKey,
    onSelectModule,
    topRight,
    children,
    enableCommandPalette = true,
  } = props;

  
  const safeModules = Array.isArray(modules) ? modules : [];
const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!enableCommandPalette) return;

    function onKey(e: KeyboardEvent) {
      const k = String(e.key || "").toLowerCase();
      const isMod = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
      if (isMod && k === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (k === "escape") setPaletteOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableCommandPalette]);

  return (
    <div className="cc-root">
      <div className="cc-shell">
        <aside className="cc-rail" aria-label="Command Center Navigation">
          <div className="cc-railHeader">
            <div className="cc-brand">
              <div className="cc-brandTitle">State Alliance Command</div>
              <div className="cc-bloodTag">Z-OPS</div>
            </div>
          </div>

          <div className="cc-railItems">
            {safeModules.map((m) => {
              const active = m.key === activeModuleKey;
              return (
                <button
                  key={m.key}
                  type="button"
                  className={"cc-railBtn" + (active ? " cc-railBtnActive" : "")}
                  onClick={() => onSelectModule?.(m.key)}
                >
                  <div className="cc-railBtnLabel">{m.label}</div>
                  {m.hint ? <div className="cc-railBtnHint">{m.hint}</div> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="cc-main">
          <header className="cc-topBar">
            <div className="cc-title">
              <h1>{title}</h1>
              {subtitle ? <small>{subtitle}</small> : null}
            </div>
            <div className="cc-topRight">
              {topRight}
              {enableCommandPalette ? (
                <button
                  type="button"
                  className="cc-kBtn"
                  onClick={() => setPaletteOpen(true)}
                  title="Command Palette (Ctrl+K / Cmd+K)"
                >
                  Ctrl+K
                </button>
              ) : null}
            </div>
          </header>

          <section className="cc-mainPanel">{children}</section>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        modules={safeModules}
        onClose={() => setPaletteOpen(false)}
        onSelect={(k) => {
          setPaletteOpen(false);
          onSelectModule?.(k);
        }}
      />
    </div>
  );
}

export default CommandCenterShell;


