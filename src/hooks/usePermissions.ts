import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export function usePermissions() {
  const { session } = useAuth();

  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    supabase
      .from("user_permissions")
      .select("permissions(key)")
      .eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("Permission load failed", error);
          setPermissions([]);
        } else {
          const keys = data
            .map((row: any) => row.permissions?.key)
            .filter(Boolean);
          setPermissions(keys);
        }
        setLoading(false);
      });
  }, [session?.user?.id]);

  function hasPermission(key: string) {
    if (loading) return false;
    return permissions.includes(key);
  }

  return {
    permissions,
    hasPermission,
    loading,
  };
}
