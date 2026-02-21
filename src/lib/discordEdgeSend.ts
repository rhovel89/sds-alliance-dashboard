import { supabase } from "./supabaseClient";
import { appendDiscordSendLog } from "./discordSendLog";

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
    const __preview = (req?.content || "").toString().slice(0, 160);
    const err = (r as any)?.error;
    if (err) return { ok: false, error: String(err?.message || err), details: err };
    appendDiscordSendLog({ source: "unknown", channelId: req.channelId, channelName: null, contentPreview: __preview, ok: false, error: String(err?.message || err), details: err });

    const data = (r as any)?.data;
    if (data && data.ok === false) return { ok: false, error: String(data.error || "Send failed"), details: data };
    appendDiscordSendLog({ source: "unknown", channelId: req.channelId, channelName: null, contentPreview: __preview, ok: false, status: data.discordStatus || null, error: String(data.error || "Send failed"), details: data });

    return { ok: true, data };
    appendDiscordSendLog({ source: "unknown", channelId: req.channelId, channelName: null, contentPreview: __preview, ok: true, status: (data && data.discordStatus) ? data.discordStatus : null, details: data });
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
