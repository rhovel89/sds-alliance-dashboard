import AppRoutes from "./routes/AppRoutes";
import TopNav from "./components/nav/TopNav";
import AuthRedirector from "./components/auth/AuthRedirector";
import AppErrorBoundary from "./components/system/AppErrorBoundary";
import ThemeBootstrap from "./components/theme/ThemeBootstrap";
import GlobalStatusFab from "./components/system/GlobalStatusFab";
import FloatingLanguageSwitcher from "./components/i18n/FloatingLanguageSwitcher";

export default function App() {
  return (
    <>
      <AppErrorBoundary>
      <AuthRedirector />
      <TopNav />
      <ThemeBootstrap />
      <AppRoutes />
      <GlobalStatusFab />
      </AppErrorBoundary>
    </>
  );
}

