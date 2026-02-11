import { useParams } from 'react-router-dom';

export default function Permissions() {
  const { alliance_id } = useParams();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🔐 Permissions — {alliance_id}</h2>
      <p>Members: View</p>
      <p>R4 / R5: Edit</p>
      <p>Owner: Global Edit</p>
    </div>
  );
}
