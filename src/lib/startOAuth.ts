import { supabase } from "./supabaseClient";

export type OAuthProvider = "discord" | "google";

export async function startOAuth(provider: OAuthProvider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }
}
