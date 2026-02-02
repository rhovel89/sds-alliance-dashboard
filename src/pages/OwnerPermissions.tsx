import { useParams } from "react-router-dom";

export default function OwnerPermissions() {
  const { allianceId } = useParams();

  return (
    <div className="page">
      <h1>Alliance Permissions</h1>

      <p>
        Managing permissions for alliance:
        <strong style={{ marginLeft: 8 }}>{allianceId}</strong>
      </p>

      <div className="card">
        <p>🧟 Owner-only permissions panel</p>
        <p>Member role management coming next.</p>
      </div>
    </div>
  );
}
