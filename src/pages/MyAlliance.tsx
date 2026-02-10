import { useParams } from "react-router-dom";

export default function MyAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>Alliance Command Center</h1>
      <p>Alliance ID: {alliance_id}</p>
    </div>
  );
}
