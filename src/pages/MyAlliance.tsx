import { useParams, useNavigate } from "react-router-dom";

export default function MyAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const navigate = useNavigate();

  if (!alliance_id) {
    navigate("/");
    return null;
  }

  return (
    <div className="zombie-card">
      <h1>Alliance Dashboard</h1>
      <p>Alliance ID: {alliance_id}</p>
    </div>
  );
}
