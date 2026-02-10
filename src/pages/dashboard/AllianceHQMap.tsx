import { useParams } from "react-router-dom";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{
      padding: 32,
      color: "lime",
      fontSize: 24,
      fontWeight: "bold"
    }}>
      🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}
    </div>
  );
}
