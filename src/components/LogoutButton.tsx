import { supabase } from "../lib/supabaseClient";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      Log Out
    </button>
  );
}
