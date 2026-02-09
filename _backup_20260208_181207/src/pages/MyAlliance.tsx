import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/command-center.css";

type Role = "Member" | "R4" | "R5" | "Mod" | "Owner";

export default function MyAlliance() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("Member");
  const [memberCount, setMemberCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [hqFilled, setHqFilled] = useState(0);
  const [hqLocked, setHqLocked] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [templateLastRun, setTemplateLastRun] = useState<string | null>(null);
  const [roleBreakdown, setRoleBreakdown] = useState<Record<string, number>>({});

  const isLeader = ["R4", "R5", "Mod", "Owner"].includes(role);

  useEffect(() => {
    if (!allianceId) return;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ROLE
      const { data: me } = await supabase
        .from("alliance_members")
        .select("role")
        .eq("alliance_id", allianceId)
        .eq("user_id", user.id)
        .single();

      if (me?.role) setRole(me.role);

      // MEMBERS + ROLE BREAKDOWN
      const { data: members } = await supabase
        .from("alliance_members")
        .select("role")
        .eq("alliance_id", allianceId);

      setMemberCount(members?.length ?? 0);

      const breakdown: Record<string, number> = {};
      members?.forEach(m => {
        breakdown[m.role] = (breakdown[m.role] || 0) + 1;
      });
      setRoleBreakdown(breakdown);

      // PENDING APPROVALS
      if (isLeader) {
        const { count } = await supabase
          .from("alliance_join_requests")
          .select("*", { count: "exact", head: true })
          .eq("alliance_name", allianceId)
          .eq("status", "pending");

        setPendingCount(count ?? 0);
      }

      // HQ MAP STATUS
      const { data: hq } = await supabase
        .from("alliance_hq_map")
        .select("id")
        .eq("alliance_id", allianceId);

      setHqFilled(hq?.length ?? 0);

      const { data: lock } = await supabase
        .from("alliance_settings")
        .select("hq_locked")
        .eq("alliance_id", allianceId)
        .maybeSingle();

      setHqLocked(lock?.hq_locked ?? true);

      // UPCOMING EVENTS
      const today = new Date().toISOString().split("T")[0];
      const future = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("alliance_events")
        .select("id")
        .eq("alliance_id", allianceId)
        .gte("event_date", today)
        .lte("event_date", future);

      setEventCount(events?.length ?? 0);

      // TEMPLATE LAST RUN (LEADERS ONLY)
      if (isLeader) {
        const { data: run } = await supabase
          .from("alliance_event_template_runs")
          .select("created_at")
          .eq("alliance_id", allianceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setTemplateLastRun(run?.created_at ?? null);
      }
    })();
  }, [allianceId]);

  return (
    <div className="panel scanner">
      <h2>🧠 Alliance Command Center</h2>

      <div className="command-grid">

        <div className="command-card">
          <h3>👥 Members</h3>
          <div className="command-metric">{memberCount}</div>
        </div>

        <div className="command-card">
          <h3>🗺️ HQ Map</h3>
          <div className="command-metric">{hqFilled} / 120</div>
          <button onClick={() => navigate(`/dashboard/${allianceId}/hq-map`)}>
            Open HQ Map
          </button>
          <div className="hq-preview">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className={i < Math.floor(hqFilled / 3) ? "filled" : ""} />
            ))}
          </div>
        </div>

        <div className="command-card">
          <h3>📅 Upcoming Events</h3>
          <div className="command-metric">{eventCount}</div>
        </div>

        {isLeader && (
          <div className="command-card">
            <h3>⏳ Pending Approvals</h3>
            <div className="command-metric">{pendingCount}</div>
          </div>
        )}

        {isLeader && !hqLocked && (
          <div className="command-card alert-card">
            <h3>🔔 ALERT</h3>
            <div className="alert-text">HQ MAP IS UNLOCKED</div>
          </div>
        )}

        {isLeader && (
          <div className="command-card">
            <h3>🧪 Template Last Run</h3>
            <div className="command-sub">
              {templateLastRun ? new Date(templateLastRun).toLocaleString() : "Never"}
            </div>
          </div>
        )}

        {isLeader && (
          <div className="command-card">
            <h3>📊 Role Breakdown</h3>
            <div className="role-list">
              {Object.entries(roleBreakdown).map(([r, c]) => (
                <div key={r}>{r}: {c}</div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import AllianceIntelFeed from '../components/AllianceIntelFeed';
