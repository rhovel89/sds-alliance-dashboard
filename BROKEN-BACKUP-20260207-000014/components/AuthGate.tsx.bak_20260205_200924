import { useSession } from "../hooks/useSession";

export default function AuthGate({ children }: { children: JSX.Element }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div style={{
        background: "#000",
        color: "#9f0000",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace"
      }}>
        Initializing session…
      </div>
    );
  }

  return children;
}
