import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function MyAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!alliance_id) {
      navigate("/");
    }
  }, [alliance_id, navigate]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Alliance Command Center</h1>
      <p>Alliance: {alliance_id}</p>
    </div>
  );
}
