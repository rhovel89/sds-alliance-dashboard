import { supabase } from "./supabaseClient";

export type DiscordSendBotRequest = {
  mode: "bot";
  channelId: string;
  content: string;
  dryRun?: boolean;
};

export type DiscordSendResult =
  | { ok: true; data: any }
  | { ok: false; error: string; details?: any };

export async function sendDiscordBot(req: DiscordSendBotRequest): Promise<DiscordSendResult> {
  try {
    const r = await supabase.functions.invoke("discord-send", { body: req as any });
    const err = (r as any)?.error;
    if (err) return { ok: false, error: String(err?.message || err), details: err };

    const data = (r as any)?.data;
    if (data && data.ok === false) return { ok: false, error: String(data.error || "Send failed"), details: data };

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}