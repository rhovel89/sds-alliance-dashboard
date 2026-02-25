import { useParams } from "react-router-dom";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }} data-sad-topbar="1">
      <h2>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id.toUpperCase()}</h2>
      <p>HQ slots will render here.</p>
    </div>
  );
}
