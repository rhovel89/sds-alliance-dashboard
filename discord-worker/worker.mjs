import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_BOT_TOKEN = process.env.BOT_TOKEN;

const POLL_MS = Number(process.env.POLL_MS || 15000);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 5);
const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";


const AUTO_REMINDERS = String(process.env.AUTO_REMINDERS || "true").toLowerCase() === "true";
const REMINDER_STATE_CODE = process.env.REMINDER_STATE_CODE || "789";
const REMINDER_HOURS = Number(process.env.REMINDER_HOURS || 24);
const REMINDER_INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS || 300000);

let lastReminderRun = 0;if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!DISCORD_BOT_TOKEN && !DRY_RUN) {
  console.error("Missing BOT_TOKEN (or set DRY_RUN=true)");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function discordSend(channelId, content) {
  if (!/^\d{10,25}$/.test(String(channelId || ""))) {
    return { ok: false, status: 0, detail: `Invalid channel id: ${channelId}` };
  }
  if (DRY_RUN) return { ok: true, status: 200, detail: "DRY_RUN: not sent" };

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: String(content || "").slice(0, 1900),
        allowed_mentions: { parse: ["users", "roles"] },
      }),
    });

    if (res.status === 429) {
      const j = await res.json().catch(() => null);
      const retry = Math.ceil(Number(j?.retry_after || 1) * 1000);
      console.warn(`Rate limited. Waiting ${retry}ms`);
      await sleep(retry);
      continue;
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, detail: JSON.stringify(body).slice(0, 900) };
    return { ok: true, status: res.status, detail: body?.id ? String(body.id) : "sent" };
  }
}

async function markSent(id, discordMessageId) {
  await sb.from("discord_send_queue").update({
    status: "sent",
    status_detail: "sent",
    discord_message_id: discordMessageId || null,
    sent_at: new Date().toISOString(),
  }).eq("id", id);
}

async function markFailed(id, detail) {
  await sb.from("discord_send_queue").update({
    status: "failed",
    status_detail: String(detail || "failed").slice(0, 900),
  }).eq("id", id);
}

async function claimBatch() {
  const r = await sb.rpc("claim_discord_queue_items", { p_limit: BATCH_SIZE });
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
}

async function resetStuck() {
  const r = await sb.rpc("reset_stuck_discord_queue", { p_minutes: 10 }

async function maybeQueueReminders() {
  if (!AUTO_REMINDERS) return;
  const now = Date.now();
  if (now - lastReminderRun < REMINDER_INTERVAL_MS) return;

  lastReminderRun = now;
  try {
    const r = await sb.rpc("queue_event_reminders", { p_state_code: REMINDER_STATE_CODE, p_hours: REMINDER_HOURS });
    if (r.error) {
      console.warn("queue_event_reminders error:", r.error.message);
    } else {
      console.log("Reminders queued:", r.data ?? 0);
    }
  } catch (e) {
    console.warn("queue_event_reminders exception:", e?.message || e);
  }
});
  if (r.error) console.warn("reset_stuck_discord_queue error:", r.error.message);
}

async function loopOnce() {
  await resetStuck();
  
  await maybeQueueReminders();const batch = await claimBatch();
  if (!batch.length) return;

  for (const item of batch) {
    try {
      const channelId = item.channel_name; // your DB stores channel_id here
      const content = item.message || "";
      const sent = await discordSend(channelId, content);

      if (sent.ok) {
        console.log("SENT", item.id, "->", channelId, sent.detail);
        await markSent(item.id, sent.detail);
      } else {
        console.warn("FAILED", item.id, "->", channelId, sent.status, sent.detail);
        await markFailed(item.id, `${sent.status}: ${sent.detail}`);
      }
    } catch (e) {
      console.warn("FAILED", item.id, e?.message || e);
      await markFailed(item.id, e?.message || String(e));
    }
  }
}

async function main() {
  console.log("Discord sender worker starting…", { POLL_MS, BATCH_SIZE, DRY_RUN });
  while (true) {
    try { await loopOnce(); }
    catch (e) { console.error("Loop error:", e?.message || e); }
    await sleep(POLL_MS);
  }
}

main();


