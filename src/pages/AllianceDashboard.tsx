import { useSession } from "../hooks/useSession";

export default function AllianceDashboard() {
  const { loading, session } = useSession();

  if (loading) {
    return <div>Loading dashboard…</div>;
  }

  if (!session) {
    return <div>Session missing. Please refresh.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard Loaded ✅</h1>
      <pre>{JSON.stringify(session.user, null, 2)}</pre>
    </div>
  );
}
