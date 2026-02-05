import { useEffect } from "react";
import { setPageTitle } from "../utils/pageTitle";

export default function Login() {
  useEffect(() => {
    setPageTitle("Login");
  }, []);

  return (
    <>
      <div className="auth-title">Sign in</div>
      <div className="auth-subtitle">
        Access the State 789 Alliance Dashboard
      </div>

      {/* EXISTING LOGIN BUTTONS / UI BELOW */}
    </>
  );
}
