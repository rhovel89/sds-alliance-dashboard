import { supabase } from "../lib/supabaseClient";

export default function LogoutButton() {
  console.log("LOGOUT BUTTON RENDERED - BUILD CHECK");

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <button onClick={handleLogout}>
      Log Out
    </button>
  );
}
