import { supabase } from "./supabaseBrowserClient";

const DISCORD_BROADCAST_URL = "https://pvngssnazuzekriakqds.supabase.co/functions/v1/discord-broadcast";

async function parseResponse(resp: Response) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function callDiscordBroadcast(body: any) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      return { ok: false, error: "No active Supabase session. Sign in again and retry." };
    }

    const resp = await fetch(DISCORD_BROADCAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body ?? {}),
    });

    const data = await parseResponse(resp);

    if (!resp.ok) {
      const error =
        data && typeof data === "object" && "error" in (data as any)
          ? String((data as any).error)
          : `HTTP ${resp.status}`;

      return { ok: false, error, status: resp.status, data };
    }

    return { ok: true, status: resp.status, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function sendDiscordBot(body: any) {
  return await callDiscordBroadcast(body);
}

export default sendDiscordBot;
