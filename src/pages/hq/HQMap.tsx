import { useParams } from "react-router-dom";

export default function HQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24, color: "lime", fontSize: 24 }}>
      HQ MAP LOADED FOR ALLIANCE: {alliance_id}
    </div>
  );
}
