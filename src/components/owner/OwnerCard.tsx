import type { ReactNode } from "react";

export default function OwnerCard(props: {
  title: string;
  icon?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 14,
        background: "rgba(20,20,20,0.6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>
          {props.icon ? <span style={{ marginRight: 8 }}>{props.icon}</span> : null}
          {props.title}
        </div>
        {props.right ? <div>{props.right}</div> : null}
      </div>

      <div style={{ marginTop: 10 }}>{props.children}</div>
    </div>
  );
}
