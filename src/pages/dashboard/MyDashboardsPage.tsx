import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getCanonicalPlayerIdForUser } from "../../utils/getCanonicalPlayerId";
import OpsFeedPanel from "../../components/commandcenter/OpsFeedPanel";

type Membership = { alliance_code: string; role: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function HeroAction(props: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className="zombie-btn"
      style={{
        padding: "12px 14px",
        fontWeight: 900,
        minWidth: 180,
        boxShadow: props.primary ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
      }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

function FeatureCard(props: {
  icon: string;
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 18,
        minHeight: 220,
        display: "grid",
        gap: 10,
        alignContent: "start",
        background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,16,0.94))",
      }}
    >
      <div style={{ fontSize: 28 }}>{props.icon}</div>
      <div style={{ fontSize: 20, fontWeight: 950 }}>{props.title}</div>
      <div style={{ opacity: 0.84, lineHeight: 1.6 }}>{props.text}</div>
      <div>
        <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={props.onClick}>
          {props.cta}
        </button>
      </div>
    </div>
  );
}

function CategoryTile(props: { title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 120,
        display: "grid",
        gap: 8,
        background: "rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.55 }}>{props.text}</div>
    </div>
  );
}

function StepRow(props: { step: string; title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          borderRadius: 12,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          fontWeight: 950,
          textAlign: "center",
        }}
      >
        {props.step}
      </div>
      <div>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
        <div style={{ opacity: 0.82, marginTop: 6, lineHeight: 1.6 }}>{props.text}</div>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; sub: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 950 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

export default function MyDashboardsPage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const rtRef = useRef<any>(null);

  const managers = useMemo(() => memberships.filter((m) => isManagerRole(m.role)), [memberships]);
  const primaryMembership = useMemo(() => memberships[0] ?? null, [memberships]);
  const primaryManager = useMemo(() => managers[0] ?? null, [managers]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      const id = u?.user?.id ?? null;

      setUid(id);
      if (!id) {
        setErr("Please sign in.");
        setMemberships([]);
        setPlayerId(null);
        return;
      }

      try {
        const a = await supabase.rpc("is_app_admin");
        if (typeof a.data === "boolean") setIsAdmin(a.data);
      } catch {}

      const pid = await getCanonicalPlayerIdForUser(id);
      setPlayerId(pid);

      if (!pid) {
        setMemberships([]);
        return;
      }

      const mRes = await supabase
        .from("player_alliances")
        .select("alliance_code,role")
        .eq("player_id", pid)
        .order("alliance_code", { ascending: true });

      if (mRes.error) throw mRes.error;

      setMemberships(
        (mRes.data ?? []).map((r: any) => ({
          alliance_code: upper(r.alliance_code),
          role: (r.role ?? null) as any,
        }))
      );
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setMemberships([]);
      setPlayerId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const onFocus = () => void load();
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!playerId) return;

    try {
      if (rtRef.current) supabase.removeChannel(rtRef.current);
    } catch {}

    const ch = supabase
      .channel("rt-my-dashboards-" + playerId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_alliances", filter: `player_id=eq.${playerId}` },
        () => { void load(); }
      )
      .subscribe();

    rtRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [playerId]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 14 }}>
      <div
        className="zombie-card"
        style={{
          padding: 22,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill text="MY DASHBOARDS" />
          <Pill text="ALLIANCE ACCESS" />
          <Pill text="PERSONAL HUB" />
          <Pill text="REALTIME MEMBERSHIPS" />
        </div>

        <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
          Dashboard Launch Hub
        </div>

        <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
          A cleaner front door for your dashboards. Jump into your personal hub, state tools, and alliance dashboards from one place
          while keeping the current alliance routes and auth flow exactly as they are.
        </div>

        <div style={{ opacity: 0.72, marginTop: 10, fontSize: 12 }}>
          {uid ? "Signed in ✅" : "Not signed in"}{playerId ? " • Player linked" : " • No player linked"}
          {isAdmin ? " • Admin access" : ""}{err ? ` • ${err}` : ""}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <HeroAction primary label="🧍 Personal Hub" onClick={() => nav("/me")} />
          <HeroAction label="🗺️ State Hub" onClick={() => nav("/state/789")} />
          <HeroAction
            label="⚔️ Alliance Dashboard"
            onClick={() => {
              if (primaryManager?.alliance_code) nav(`/dashboard/${encodeURIComponent(primaryManager.alliance_code)}`);
              else if (primaryMembership?.alliance_code) nav(`/dashboard/${encodeURIComponent(primaryMembership.alliance_code)}/announcements`);
            }}
          />
          <HeroAction label="📬 Mail" onClick={() => nav("/mail")} />
          {isAdmin ? <HeroAction label="👑 Owner" onClick={() => nav("/owner")} /> : null}
        </div>
      </div>

      {err ? (
        <div
          className="zombie-card"
          style={{
            padding: 14,
            border: "1px solid rgba(255,100,100,0.35)",
            background: "rgba(60,0,0,0.18)",
          }}
        >
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <MiniStat label="ALLIANCES" value={String(memberships.length)} sub="Assigned to your player" />
        <MiniStat label="MANAGE" value={String(managers.length)} sub="Alliance dashboards you can manage" />
        <MiniStat label="PLAYER" value={playerId ? "LINKED" : "MISSING"} sub={playerId ? "Ready for dashboard access" : "Needs player linkage"} />
        <MiniStat label="OWNER" value={isAdmin ? "YES" : "NO"} sub={isAdmin ? "Admin tools available" : "Standard access"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <FeatureCard
          icon="🧍"
          title="Personal Dashboard"
          text="Open your personal command center for profile, HQs, announcements, alerts, events, and mail preview."
          cta="Open /me"
          onClick={() => nav("/me")}
        />
        <FeatureCard
          icon="⚔️"
          title="Alliance Dashboards"
          text="Jump into alliance announcements, guides, HQ maps, calendars, and management pages based on your assigned memberships."
          cta={primaryManager ? "Open Managed Alliance" : "Open Alliance Access"}
          onClick={() => {
            if (primaryManager?.alliance_code) nav(`/dashboard/${encodeURIComponent(primaryManager.alliance_code)}`);
            else if (primaryMembership?.alliance_code) nav(`/dashboard/${encodeURIComponent(primaryMembership.alliance_code)}/announcements`);
          }}
        />
        <FeatureCard
          icon="🗺️"
          title="State Hub"
          text="Move into the State 789 command pages for alerts, discussion, achievements, threads, and state ops."
          cta="Open State Hub"
          onClick={() => nav("/state/789")}
        />
        <FeatureCard
          icon="📬"
          title="Mail Center"
          text="Go directly to your inbox and thread view from the main dashboards landing page."
          cta="Open Mail"
          onClick={() => nav("/mail")}
        />
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 950 }}>Live Ops Feed</div>
        <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
          Realtime intel from State 789 so you can jump quickly into active threads and movement.
        </div>

        <div style={{ marginTop: 14 }}>
          <OpsFeedPanel stateCode="789" limit={8} />
        </div>
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 950 }}>Core dashboard areas</div>
        <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
          The routes underneath stay the same. This page is only a cleaner launcher for the areas you already use.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          <CategoryTile title="Personal Hub" text="Profile, HQs, alerts, announcements, events, and quick personal tools." />
          <CategoryTile title="Alliance Access" text="Announcements, guides, HQ map, calendar, and alliance management where allowed." />
          <CategoryTile title="State Access" text="State 789 alerts, discussion, threads, achievements, and operations." />
          <CategoryTile title="Mail" text="Inbox, threads, and direct message access from your main landing page." />
          <CategoryTile title="Manager Tools" text="Alliance dashboard management remains available for owner, R4, and R5 roles." />
          <CategoryTile title="Owner Tools" text="Admin access still appears only when your account has app admin rights." />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <StepRow
          step="STEP 1"
          title="Choose your dashboard area"
          text="Use the top launch actions to go directly into your personal hub, alliance pages, state tools, or mail."
        />
        <StepRow
          step="STEP 2"
          title="Open the right alliance page"
          text="Membership-aware cards and lists below keep all your alliance links in one place without changing the actual routes."
        />
        <StepRow
          step="STEP 3"
          title="Use this as the main launcher"
          text="This page becomes the cleaner front door for dashboard access while leaving auth and downstream pages untouched."
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div className="zombie-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>🧭 Quick Alliance Links</div>

          {memberships.length === 0 ? (
            <div style={{ marginTop: 12, opacity: 0.75 }}>No alliances assigned yet.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {memberships.map((m) => {
                const code = upper(m.alliance_code);
                const manager = isManagerRole(m.role);
                const viewSuffix = manager ? "" : "?view=1";

                return (
                  <div
                    key={code}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>
                        {code} {m.role ? `(${String(m.role)})` : ""}
                      </div>
                      <Link to={`/me?alliance=${encodeURIComponent(code)}`} style={{ fontWeight: 900 }}>
                        Open in ME
                      </Link>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/announcements`}>Announcements</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/guides`}>Guides</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/hq-map${viewSuffix}`}>HQ Map</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/calendar${viewSuffix}`}>Calendar</Link>
                      {manager ? <Link to={`/dashboard/${encodeURIComponent(code)}`} style={{ fontWeight: 900 }}>Manage</Link> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="zombie-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>⚔️ Alliance Dashboards You Can Manage</div>

          {managers.length === 0 ? (
            <div style={{ marginTop: 12, opacity: 0.75 }}>No manager dashboards available.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {managers.map((m) => (
                <div
                  key={m.alliance_code}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{upper(m.alliance_code)}</div>
                    <Link to={`/dashboard/${encodeURIComponent(upper(m.alliance_code))}`} style={{ fontWeight: 900 }}>
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 16,
          background: "rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18 }}>Quick links</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/me")}>
            ME
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/mail")}>
            Mail
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>
            State Hub
          </button>
          {isAdmin ? (
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner")}>
              Owner
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
