import React from "react";
import SupportBundleButton from "./SupportBundleButton";

type State = { hasError: boolean; error?: any; info?: any };

export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children as any;

    const err = this.state.error;
    const msg = String(err?.message || err || "Unknown error");
    const stack = String(err?.stack || "");
    const comp = String(this.state.info?.componentStack || "");

    return (
      <div style={{ padding: 14 }}>
        <div className="zombie-card" style={{ border: "1px solid rgba(255,0,0,0.25)" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>🧟 App Error (caught)</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SupportBundleButton label="Copy Support Bundle" />
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => (window.location.href = "/status")}>
              Open /status
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>

          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>
{msg}

{stack}

{comp}
          </pre>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            This is a safety net to prevent “black pages”. Paste the support bundle JSON into chat if needed.
          </div>
        </div>
      </div>
    );
  }
}