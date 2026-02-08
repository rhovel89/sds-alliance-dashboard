function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, session } = useSession();

  // 🚫 NEVER redirect while loading
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Loading…</div>
      </div>
    );
  }

  // 🚫 Give session time to hydrate (PKCE safety)
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Finalizing session…</div>
      </div>
    );
  }

  return children;
}
