import React from "react";
import "../../styles/commandCenter.css";

export type CommandCenterModule = {
  key: string;
  label: string;
  hint?: string;
};

export function CommandCenterShell(props: {
  title: string;
  subtitle?: string;
  modules: CommandCenterModule[];
  activeModuleKey?: string;
  onSelectModule?: (key: string) => void;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, subtitle, modules, activeModuleKey, onSelectModule, topRight, children } = props;

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
            {modules.map((m) => {
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
            <div>{topRight}</div>
          </header>

          <section className="cc-mainPanel">{children}</section>
        </main>
      </div>
    </div>
  );
}

export default CommandCenterShell;
