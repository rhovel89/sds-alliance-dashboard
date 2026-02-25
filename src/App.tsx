import AppRoutes from "./routes/AppRoutes";
import TopNav from "./components/nav/TopNav";
import AuthRedirector from "./components/auth/AuthRedirector";
import AppErrorBoundary from "./components/system/AppErrorBoundary";
import ThemeBootstrap from "./components/theme/ThemeBootstrap";
import GlobalStatusFab from "./components/system/GlobalStatusFab";
import FloatingLanguageSwitcher from "./components/i18n/FloatingLanguageSwitcher";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import MobileSidebarToggle from "./components/nav/MobileSidebarToggle";
import MobileTopbarToggle from "./components/nav/MobileTopbarToggle";

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
    <>
      <AppErrorBoundary>
      <AuthRedirector />
      <TopNav />
      <ThemeBootstrap />
      <AppRoutes />
      <GlobalStatusFab />
      </AppErrorBoundary>
      <FloatingLanguageSwitcher />
      <MobileSidebarToggle />
      <MobileTopbarToggle />
    </>
    </I18nextProvider>
  );
}





