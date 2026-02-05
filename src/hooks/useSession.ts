import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type SessionState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    session: null,
    user: null,
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setState({
          loading: false,
          session,
          user: session?.user ?? null,
        });
      }
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
