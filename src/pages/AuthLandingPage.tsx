import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AuthLandingPage.css";

export default function AuthLandingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [isError, setIsError] = useState(false);
  const [videoOk, setVideoOk] = useState(true);

  const VIDEO_SRC = "/auth/zombie-ambient.mp4";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session) {
        setMsg("You’re already signed in. Redirecting…");
        setIsError(false);
        nav("/onboarding", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  const signIn = async (provider: "google" | "discord") => {
    setBusy(true);
    setMsg("");
    setIsError(false);

    const redirectTo = `${window.location.origin}/onboarding`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    // On success, Supabase redirects away.
    if (error) {
      setMsg(error.message);
      setIsError(true);
      setBusy(false);
    }
  };

  return (
    <div className="authRoot">
      {/* Background video (optional). Put file at: public/auth/zombie-ambient.mp4 */}
      <div className="bgVidWrap" aria-hidden="true">
        {videoOk ? (
) : null}
      </div>

      {/* Horror overlays */}
      <div className="overlays" aria-hidden="true">
        <div className="zombieTint" />
        <div className="fog" />
        <div className="bloodDrips" />
        <div className="grain" />
        <div className="flicker" />
      </div>

      {/* Foreground */}
      <div className="authShell">
        <div className="hero">
          <div className="brandRow">
            <div className="brandMark" aria-hidden="true" />
            <div>
              <h1 className="brandTitle">State Alliance Dashboard</h1>
              <p className="brandSub">Command. Coordinate. Conquer.</p>
            </div>
          </div>

          <div className="tagline">
            An eerie war room for survivors — announcements, guides, HQ intel, and daily ops in one place.
          </div>

          <div className="heroGrid">
            <div className="pill">
              <p className="pillLabel">Live Ops</p>
              <p className="pillValue">Announcements • Guides • Events</p>
            </div>
            <div className="pill">
              <p className="pillLabel">HQ Intelligence</p>
              <p className="pillValue">Map • Positions • Personal HQs</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="cardTitle">Sign in to continue</h2>
          <p className="cardText">Choose a provider. You’ll return after authentication.</p>

          <div className="btnCol">
            <button className="btn" disabled={busy} onClick={() => signIn("google")}>
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 3.1-4.2 3.1-7z" fill="currentColor" opacity="0.9"/>
                  <path d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.6 0-4.7-1.7-5.5-4h-3.2v2.5C4.9 19.8 8.2 22 12 22z" fill="currentColor" opacity="0.75"/>
                  <path d="M6.5 13.1c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7H3.3C2.5 8.5 2 10.2 2 11.9s.5 3.4 1.3 4.9l3.2-2.5z" fill="currentColor" opacity="0.6"/>
                  <path d="M12 5.6c1.4 0 2.6.5 3.6 1.4l2.6-2.6C16.8 2.9 14.6 2 12 2 8.2 2 4.9 4.2 3.3 7l3.2 2.5c.8-2.3 2.9-3.9 5.5-3.9z" fill="currentColor" opacity="0.7"/>
                </svg>
              </span>
              Continue with Google
            </button>

            <button className="btn" disabled={busy} onClick={() => signIn("discord")}>
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M16.9 6.4c-1.2-.6-2.5-1-3.8-1.2l-.5 1c-1.4-.2-2.9-.2-4.3 0l-.5-1c-1.3.2-2.6.6-3.8 1.2C2 10 1.4 13.5 1.7 16.9c1.4 1 2.9 1.7 4.6 2.2l.9-1.5c-.5-.2-1-.4-1.4-.7l.3-.2c2.8 1.3 5.8 1.3 8.6 0l.3.2c-.4.3-.9.5-1.4.7l.9 1.5c1.7-.5 3.2-1.2 4.6-2.2.3-3.4-.3-6.9-2.2-10.5z" fill="currentColor" opacity="0.9"/>
                  <path d="M9.1 14.7c-.7 0-1.2-.6-1.2-1.4s.5-1.4 1.2-1.4 1.2.6 1.2 1.4-.5 1.4-1.2 1.4zm5.8 0c-.7 0-1.2-.6-1.2-1.4s.5-1.4 1.2-1.4 1.2.6 1.2 1.4-.5 1.4-1.2 1.4z" fill="currentColor" opacity="0.6"/>
                </svg>
              </span>
              Continue with Discord
            </button>
          </div>

          {msg ? (
            <div className={"msg" + (isError ? " msgError" : "")}>{msg}</div>
          ) : null}

          <div className="finePrint">
            Secure sign-in powered by Supabase. After approval & alliance assignment, onboarding won’t repeat.
          </div>
        </div>
      </div>
    </div>
  );
}

