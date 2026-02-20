import React from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any; componentStack?: string };

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

async function safeRpcBool(name: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc(name as any);
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}

function CrashOverlay(props: { error: any; componentStack?: string }) {
  const [bundle, setBundle] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const href = typeof window !== "undefined" ? window.location.href : "";
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const alliance = typeof window !== "undefined" ? (getAllianceFromPath(path) || null) : null;

      let theme: string | null = null;
      try { theme = localStorage.getItem("sad_theme"); } catch { theme = null; }

      let userId: string | null = null;
      try {
        const u = await supabase.auth.getUser();
        userId = (u as any)?.data?.user?.id ?? null;
      } catch { userId = null; }

      const isOwner = await safeRpcBool("is_dashboard_owner");
      const isAppAdmin = await safeRpcBool("is_app_admin");

      const payload = {
        tsUtc: new Date().toISOString(),
        href,
        path,
        alliance,
        theme: theme || "unknown",
        userId,
        isDashboardOwner: isOwner,
        isAppAdmin,
        browserOnline: typeof navigator !== "undefined" ? navigator.onLine : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        errorMessage: String(props.error?.message || props.error || "unknown error"),
        errorStack: String(props.error?.stack || ""),
        componentStack: props.componentStack || "",
      };

      if (!cancelled) { setBundle(payload); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [props.error, props.componentStack]);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:999999,
      background:"radial-gradient(1200px 600px at 20% 0%, rgba(80,0,0,0.45), rgba(0,0,0,0.92))",
      color:"rgba(255,240,240,0.92)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16
    }}>
      <div className="zombie-card" style={{ width:"min(980px, 96vw)", padding:16 }}>
        <h2 style={{ marginTop:0 }}>🧟‍♂️ App Crashed</h2>
        <div style={{ opacity:0.9, marginBottom:10 }}>
          A runtime error occurred. Copy the crash bundle and recover.
        </div>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="zombie-btn" disabled={loading}
            onClick={() => { navigator.clipboard?.writeText(JSON.stringify(bundle || {loading:true}, null, 2)); window.alert("Copied crash bundle."); }}>
            🧾 Copy Crash Bundle
          </button>
          <button className="zombie-btn" onClick={() => (window.location.href = "/status")}>🧪 Go to /status</button>
          <button className="zombie-btn" onClick={() => window.location.reload()}>🔄 Reload</button>
        </div>

        <hr className="zombie-divider" />

        <div style={{ display:"grid", gap:8 }}>
          <div style={{ fontSize:12, opacity:0.75 }}>Error</div>
          <div style={{
            whiteSpace:"pre-wrap", background:"rgba(0,0,0,0.25)",
            border:"1px solid rgba(255,120,120,0.18)", borderRadius:12, padding:10,
            maxHeight:220, overflow:"auto"
          }}>
            {String(props.error?.message || props.error || "unknown error")}
          </div>

          <div style={{ fontSize:12, opacity:0.75 }}>Component stack</div>
          <div style={{
            whiteSpace:"pre-wrap", background:"rgba(0,0,0,0.25)",
            border:"1px solid rgba(255,120,120,0.18)", borderRadius:12, padding:10,
            maxHeight:180, overflow:"auto"
          }}>
            {props.componentStack || "(none)"}
          </div>

          <div style={{ fontSize:12, opacity:0.75 }}>Bundle preview</div>
          <div style={{
            whiteSpace:"pre-wrap", background:"rgba(0,0,0,0.25)",
            border:"1px solid rgba(255,120,120,0.18)", borderRadius:12, padding:10,
            maxHeight:220, overflow:"auto"
          }}>
            {loading ? "Loading…" : JSON.stringify(bundle, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] crash:", error, info);
    this.setState({ componentStack: info?.componentStack || "" });
  }

  render() {
    if (this.state.hasError) {
      return <CrashOverlay error={this.state.error} componentStack={this.state.componentStack} />;
    }
    return this.props.children;
  }
}