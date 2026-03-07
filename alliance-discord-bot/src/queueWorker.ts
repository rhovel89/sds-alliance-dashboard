import { createClient } from "@supabase/supabase-js";
import type { Client as DiscordClient } from "discord.js";

type QueueRow = {
  id: string;
  kind: string;
  target: string;
  channel_id: string;
  content: string;
  meta: any;
  status: string;
  locked_at?: string | null;
  locked_by?: string | null;
  created_at?: string | null;
};

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowIso() { return new Date().toISOString(); }

function envAny(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

const SUPABASE_URL =
  envAny("SUPABASE_URL", "VITE_SUPABASE_URL", "PUBLIC_SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  envAny("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SERVICE_ROLE_KEY");

const WORKER_ID =
  envAny("RAILWAY_SERVICE_NAME", "RAILWAY_GIT_COMMIT_SHA", "DYNO") ||
  `worker-${process.pid}`;

const QUEUE_TABLE = envAny("DISCORD_QUEUE_TABLE") || "discord_send_queue";

const supabase =
  (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

async function postWebhook(webhookUrl: string, content: string) {
  const url = s(webhookUrl);
  if (!url) throw new Error("Webhook URL empty.");

  const fetchFn: any = (globalThis as any).fetch;
  if (!fetchFn) throw new Error("fetch() not available in this runtime.");

  const resp = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: s(content) }),
  });

  // Discord webhooks usually return 204 No Content on success
  if (!resp || (resp.status && resp.status >= 300)) {
    const text = resp?.text ? await resp.text().catch(() => "") : "";
    throw new Error(`Webhook post failed (${resp?.status}). ${text || ""}`.trim());
  }
}

async function sendToChannel(discord: DiscordClient, channelId: string, content: string) {
  const cid = s(channelId);
  if (!cid) throw new Error("channel_id missing.");

  const ch: any = await (discord as any).channels.fetch(cid).catch(() => null);
  if (!ch || typeof ch.send !== "function") throw new Error("Channel not found or not text-sendable.");
  await ch.send({ content: s(content) });
}

async function getWebhookUrlById(webhookId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase service client not configured in worker env.");
  const id = s(webhookId);
  if (!id) throw new Error("webhook_id missing.");

  const r = await supabase
    .from("alliance_discord_webhooks")
    .select("webhook_url,active")
    .eq("id", id)
    .maybeSingle();

  if (r.error) throw new Error(r.error.message);
  const active = (r.data as any)?.active;
  if (active === false) throw new Error("Webhook is disabled.");
  const url = s((r.data as any)?.webhook_url);
  if (!url) throw new Error("Webhook URL not found.");
  return url;
}

async function claimOne(): Promise<QueueRow | null> {
  if (!supabase) return null;

  const q = await supabase
    .from(QUEUE_TABLE)
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (q.error) return null;
  const row = (q.data && q.data[0]) ? (q.data[0] as any as QueueRow) : null;
  if (!row?.id) return null;

  // lock (best-effort CAS)
  const lock = await supabase
    .from(QUEUE_TABLE)
    .update({ status: "sending", locked_at: nowIso(), locked_by: WORKER_ID } as any)
    .eq("id", row.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (lock.error || !lock.data?.id) return null;
  return row;
}

async function markSent(id: string) {
  if (!supabase) return;
  await supabase
    .from(QUEUE_TABLE)
    .update({ status: "sent", sent_at: nowIso(), error: null } as any)
    .eq("id", id);
}

async function markError(id: string, msg: string) {
  if (!supabase) return;
  const m = s(msg).slice(0, 1800);
  await supabase
    .from(QUEUE_TABLE)
    .update({ status: "error", error: m } as any)
    .eq("id", id);
}

async function processOne(discord: DiscordClient): Promise<boolean> {
  const row = await claimOne();
  if (!row) return false;

  try {
    const kind = s(row.kind).toLowerCase();
    if (kind === "discord_webhook") {
      const webhookId = s(row.channel_id); // UI stored webhook_id here
      const webhookUrl = await getWebhookUrlById(webhookId);
      await postWebhook(webhookUrl, row.content);
    } else {
      await sendToChannel(discord, row.channel_id, row.content);
    }
    await markSent(row.id);
  } catch (e: any) {
    await markError(row.id, String(e?.message || e || "send failed"));
  }

  return true;
}

export function startQueueWorker(discord: DiscordClient) {
  const g: any = globalThis as any;
  if (g.__sadQueueWorkerStarted) return;
  g.__sadQueueWorkerStarted = true;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[queueWorker] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Worker disabled.");
    return;
  }

  console.log(`[queueWorker] started. table=${QUEUE_TABLE} worker=${WORKER_ID}`);

  const tick = async () => {
    try {
      // drain a few items per tick
      for (let i = 0; i < 4; i++) {
        const did = await processOne(discord);
        if (!did) break;
      }
    } catch (e: any) {
      console.log("[queueWorker] tick error:", String(e?.message || e || e));
    }
  };

  // start after short delay and then poll
  setTimeout(() => { void tick(); }, 1500);
  setInterval(() => { void tick(); }, 3500);
}

