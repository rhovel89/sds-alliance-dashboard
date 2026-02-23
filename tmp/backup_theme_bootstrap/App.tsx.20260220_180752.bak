import AppRoutes from "./routes/AppRoutes";
import TopNav from "./components/nav/TopNav";
import AuthRedirector from "./components/auth/AuthRedirector";
import AppErrorBoundary from "./components/system/AppErrorBoundary";

export default function App() {
  return (
    <>
      <AppErrorBoundary>
      <AuthRedirector />
      <TopNav />
      <AppRoutes />
      </AppErrorBoundary>
    </>
  );
}
