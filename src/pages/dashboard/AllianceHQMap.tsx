import { useParams } from "react-router-dom";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "lime" }}>
        HQ MAP LOADED FOR ALLIANCE: {alliance_id}
      </h1>
    </div>
  );
}
