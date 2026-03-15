import { AllianceGuidesCommandCenter } from "./AllianceGuidesCommandCenter";
import GuideMediaUploader from "../../components/guides/GuideMediaUploader";
import { useNavigate, useParams } from "react-router-dom";

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
      {props.subtitle ? (
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>{props.subtitle}</div>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {props.children}
    </div>
  );
}

function QuickLink(props: { label: string; onClick: () => void }) {
  return (
    <button
      className="zombie-btn"
      type="button"
      onClick={props.onClick}
      style={{ padding: "10px 12px" }}
    >
      {props.label}
    </button>
  );
}

export default function AllianceGuidesPage() {
  const nav = useNavigate();
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id ?? "").trim().toUpperCase();

  return (
    <div
      style={{
        width: "calc(100vw - 32px)",
        maxWidth: "none",
        marginLeft: "calc(50% - 50vw + 16px)",
        marginRight: 0,
        padding: 16,
        display: "grid",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill text={`ALLIANCE ${allianceCode || "—"}`} />
              <Pill text="GUIDES" />
              <Pill text="MEDIA + COMMAND" />
            </div>

            <div style={{ fontSize: 32, fontWeight: 950, lineHeight: 1.05 }}>
              {allianceCode || "Alliance"} Guides Hub
            </div>

            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 880 }}>
              A cleaner guides workspace for uploading media, managing guide content, and keeping alliance resources organized in one place.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <QuickLink label="Alliance Hub" onClick={() => nav(`/dashboard/${allianceCode}`)} />
            <QuickLink label="Announcements" onClick={() => nav(`/dashboard/${allianceCode}/announcements`)} />
            <QuickLink label="Calendar" onClick={() => nav(`/dashboard/${allianceCode}/calendar`)} />
            <QuickLink label="HQ Map" onClick={() => nav(`/dashboard/${allianceCode}/hq-map`)} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>WORKSPACE</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>Guides</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Alliance knowledge base and uploads</div>
        </div>

        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>ALLIANCE</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>{allianceCode || "—"}</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Current alliance context from route</div>
        </div>

        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>UPLOADS</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>Media</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Images and guide assets for this alliance</div>
        </div>

        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>CONTROL</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>Command</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Guide panels remain intact underneath</div>
        </div>
      </div>

      <SectionCard
        title="Guide media uploader"
        subtitle="Upload alliance guide media without changing the existing guide workflow."
      >
        <GuideMediaUploader allianceCode={allianceCode} />
      </SectionCard>

      <SectionCard
        title="Guides command center"
        subtitle="Existing guide management stays intact. This is only a layout redesign."
      >
        <AllianceGuidesCommandCenter />
      </SectionCard>
    </div>
  );
}
