import { supabase } from "./supabaseClient";

export async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error("Session expired");
  }
}
