import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = { user_id: string; display_name: string };

function shortUuid(s: string) {
  const t = String(s || "");
  if (t.length <= 10) return t;
  return t.slice(0, 8) + "…" + t.slice(-4);
}

export default function UserIdDisplay(props: { userId: string | null | undefined }) {
  const uid = (props.userId || "").toString();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { setName(""); return; }
      const r = await supabase.from("v_user_display_names").select("display_name").eq("user_id", uid).limit(1);
      if (!alive) return;
      if (r.error || !r.data?.length) setName("");
      else setName(String((r.data[0] as any).display_name || ""));
    })();
    return () => { alive = false; };
  }, [uid]);

  const label = useMemo(() => (name ? name : (uid ? shortUuid(uid) : "—")), [name, uid]);

  return <span title={uid}>{label}</span>;
}
