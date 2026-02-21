import { supabase } from "./supabaseClient";

export type DiscordSendMode = "bot";

export type DiscordSendRequest = {
  mode: DiscordSendMode;
  channelId: string;
  content: string;
};

export type DiscordSendResult =
  | { ok: true; data: any }
  | { ok: false; error: string; details?: any };

export async function sendDiscordBot(req: DiscordSendRequest): Promise<DiscordSendResult> {
  try {
    const body = {
      mode: "bot",
      channelId: String(req.channelId || "").trim(),
      content: String(req.content || ""),
    };

    const { data, error } = await supabase.functions.invoke("discord-broadcast", { body } as any);

    if (error) {
      return { ok: false, error: error.message, details: error };
    }

    // Function returns { ok: true/false, ... }
    if (data && data.ok === false) {
      return { ok: false, error: String(data.error || "Unknown error"), details: data };
    }

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}