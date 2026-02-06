import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message?: string; stack?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: String(err?.message || err) };
  }

  componentDidCatch(err: any) {
    // Logs show up in console even in production
    console.error("[ErrorBoundary]", err);
    this.setState({ stack: err?.stack ? String(err.stack) : undefined });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "#e5e7eb" }}>
        <h2 style={{ margin: "0 0 10px 0" }}>⚠️ Page Error</h2>
        <div style={{ opacity: 0.9, marginBottom: 10 }}>
          {this.state.message || "Unknown error"}
        </div>
        <pre style={{ whiteSpace: "pre-wrap", opacity: 0.7 }}>
          {this.state.stack || ""}
        </pre>
      </div>
    );
  }
}
