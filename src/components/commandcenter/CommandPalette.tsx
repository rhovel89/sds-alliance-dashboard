import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CommandCenterModule } from "./CommandCenterShell";

export function CommandPalette(props: {
  open: boolean;
  title?: string;
  modules: CommandCenterModule[];
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const { open, title, modules, onSelect, onClose } = props;
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return modules;
    return modules.filter((m) => {
      const hay = (m.label + " " + (m.hint || "") + " " + m.key).toLowerCase();
      return hay.includes(needle);
    });
  }, [q, modules]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && filtered[0]) onSelect(filtered[0].key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="cc-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="cc-palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cc-paletteHeader">
          <div className="cc-paletteTitle">{title || "COMMAND PALETTE"}</div>
          <div className="cc-paletteHint">Esc to close • Enter to open</div>
        </div>

        <input
          ref={inputRef}
          className="cc-paletteInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to filter modules…"
        />

        <div className="cc-paletteList" role="list">
          {filtered.map((m) => (
            <button
              key={m.key}
              type="button"
              className="cc-paletteItem"
              onClick={() => onSelect(m.key)}
            >
              <div className="cc-paletteItemLabel">{m.label}</div>
              {m.hint ? <div className="cc-paletteItemHint">{m.hint}</div> : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="cc-paletteEmpty">No matches.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
