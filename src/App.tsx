import AppRoutes from './routes/AppRoutes';
import TopNav from "./components/nav/TopNav";
import AuthRedirector from "./components/auth/AuthRedirector";

export default function App() {
  return <AuthRedirector />
      <TopNav />
      <AppRoutes />;
}

