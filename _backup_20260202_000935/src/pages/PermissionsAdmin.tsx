import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PermissionsAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("permissions").select("*")
      .then(r => setPermissions(r.data || []));

    supabase.from("onboarding_requests")
      .select("user_id, game_name")
      .eq("status", "approved")
      .then(r => setUsers(r.data || []));
  }, []);

  async function grant(userId: string, permId: string) {
    await supabase.from("user_permissions").insert({
      user_id: userId,
      permission_id: permId
    });
    alert("Granted");
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>Permissions Admin</h2>

      {users.map(u => (
        <div key={u.user_id} style={{ marginBottom: 16 }}>
          <b>{u.game_name}</b>

          {permissions.map(p => (
            <button
              key={p.id}
              onClick={() => grant(u.user_id, p.id)}
              style={{ marginLeft: 8 }}
            >
              + {p.key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
