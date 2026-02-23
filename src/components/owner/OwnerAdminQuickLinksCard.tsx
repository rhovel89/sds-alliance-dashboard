import React from "react";
import { Link } from "react-router-dom";

type Item = { to: string; label: string; desc: string };

export default function OwnerAdminQuickLinksCard() {
  const items: Item[] = [
    { to: "/owner/directory-editor", label: "Directory Editor", desc: "Edit alliance directory (localStorage + export/import)" },
    { to: "/owner/data-vault", label: "Data Vault", desc: "Export/import all sad_* localStorage configs" },
    { to: "/owner/permissions-matrix", label: "Permissions Matrix", desc: "UI-only matrix (localStorage + export/import)" },
    { to: "/mail", label: "My Mail", desc: "UI-only threads/messages (localStorage + export/import)" },
  ];

  return (
    <div style={{ marginTop: 16, border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800, fontSize: 14 }}>
        Admin Quick Links
      </div>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            style={{
              textDecoration: "none",
              border: "1px solid #222",
              borderRadius: 10,
              padding: 12,
              display: "block",
            }}
          >
            <div style={{ fontWeight: 800 }}>{it.label}</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{it.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
