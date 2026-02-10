import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer"
      }}
    >
      Log Out
    </button>
  );
}
