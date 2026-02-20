import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type RTState = "offline" | "connecting" | "online" | "error";

export function RealtimeBadge() {
  const [rt, setRt] = useState<RTState>("connecting");
  const [detail, setDetail] = useState<string>("");

  const dot = useMemo(() => {
    if (rt === "online") return "🟢";
    if (rt === "connecting") return "🟡";
    if (rt === "offline") return "⚫";
    return "🔴";
  }, [rt]);

  useEffect(() => {
    let cancelled = false;

    function setOffline(msg: string) {
      if (cancelled) return;
      setRt("offline");
      setDetail(msg);
    }

    function setConnecting(msg: string) {
      if (cancelled) return;
      setRt("connecting");
      setDetail(msg);
    }

    function setOnline(msg: string) {
      if (cancelled) return;
      setRt("online");
      setDetail(msg);
    }

    function setError(msg: string) {
      if (cancelled) return;
      setRt("error");
      setDetail(msg);
    }

    // Browser network hint
    const onOnline = () => setConnecting("browser online");
    const onOffline = () => setOffline("browser offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Supabase Realtime channel subscribe status
    setConnecting("realtime connecting");
    const ch = supabase.channel("sad_rt_badge");

    // subscribe callback statuses include: SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR
    ch.subscribe((status: any) => {
      if (status === "SUBSCRIBED") setOnline("realtime subscribed");
      else if (status === "TIMED_OUT") setError("realtime timed out");
      else if (status === "CHANNEL_ERROR") setError("realtime channel error");
      else if (status === "CLOSED") setOffline("realtime closed");
      else setDetail(String(status));
    });

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      try {
        supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div
      title={detail || "realtime status"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(120,255,120,0.18)",
        background: "rgba(0,0,0,0.25)",
        fontSize: 12,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span>{dot}</span>
      <span style={{ opacity: 0.9 }}>Realtime</span>
    </div>
  );
}