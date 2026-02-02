import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("🔥 ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#f55", padding: 24 }}>
          <h1>Dashboard crashed</h1>
          <pre>{this.state.error?.message}</pre>
          <p>Open DevTools console for full trace.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
