import { supabase } from "./supabaseBrowserClient";

export async function sendDiscordBot(body: any) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      return { ok: false, error: "No active Supabase session. Sign in again and retry." };
    }

    const { data, error } = await supabase.functions.invoke("discord-broadcast", {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      return { ok: false, error: error.message || JSON.stringify(error) };
    }

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export default sendDiscordBot;
