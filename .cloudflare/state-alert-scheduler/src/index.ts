export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STATE_ALERTS_TABLE: string;
  SITE_URL?: string;
}

type ScheduledAlert = {
  id: string;
  state_code: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  scheduled_for: string;
  mention_target: "none" | "everyone" | "here" | "leadership" | "custom";
  mention_override?: string | null;
  discord_channel_id?: string | null;
  created_by: string;
  dispatch_to_discord: boolean;
  dispatch_to_state_alerts: boolean;
};

function headers(env: Env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function rest(env: Env, path: string, init?: RequestInit) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers(env),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase REST ${res.status}: ${txt}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function rpc(env: Env, fn: string, body: any) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase RPC ${fn} ${res.status}: ${txt}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getMentionText(env: Env, row: ScheduledAlert): Promise<string> {
  if (row.mention_target === "none") return "";
  if (row.mention_target === "everyone") return "@everyone";
  if (row.mention_target === "here") return "@here";
  if (row.mention_target === "custom") return String(row.mention_override || "").trim();

  const mapped = await rest(
    env,
    `state_discord_mentions?state_code=eq.${encodeURIComponent(row.state_code)}&target_key=eq.${encodeURIComponent(row.mention_target)}&is_active=is.true&select=mention_text&limit=1`
  );

  return String(mapped?.[0]?.mention_text || "").trim();
}

function buildDiscordMessage(row: ScheduledAlert, mentionText: string, env: Env) {
  const siteUrl = String(env.SITE_URL || "https://state789.site").replace(/\/+$/, "");
  const parts = [
    mentionText,
    "🚨 **State Alert (" + row.state_code + ")**",
    "**" + row.title.slice(0, 180) + "**",
    row.body ? row.body.slice(0, 1500) : "",
    `${siteUrl}/state/${encodeURIComponent(row.state_code)}/alerts-db`,
  ].filter(Boolean);

  return parts.join("\n");
}

function buildAlertInsertPayload(row: ScheduledAlert) {
  return {
    state_code: row.state_code,
    title: row.title,
    body: row.body,
    severity: row.severity,
    created_by: row.created_by,
  };
}

async function claimDueJobs(env: Env, limit = 25): Promise<ScheduledAlert[]> {
  const nowIso = new Date().toISOString();

  const due = await rest(
    env,
    `scheduled_state_alerts?status=eq.scheduled&scheduled_for=lte.${encodeURIComponent(nowIso)}&order=scheduled_for.asc&limit=${limit}`
  ) as ScheduledAlert[] | null;

  return due || [];
}

async function claimOne(env: Env, id: string) {
  const claimed = await rest(
    env,
    `scheduled_state_alerts?id=eq.${encodeURIComponent(id)}&status=eq.scheduled`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "processing",
        claimed_at: new Date().toISOString(),
        claimed_by: "cloudflare-cron",
      }),
    }
  );

  return Array.isArray(claimed) && claimed.length > 0;
}

async function markSent(env: Env, id: string) {
  await rest(env, `scheduled_state_alerts?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_text: null,
    }),
  });
}

async function markFailed(env: Env, id: string, errorText: string) {
  await rest(env, `scheduled_state_alerts?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "failed",
      error_text: errorText.slice(0, 1800),
    }),
  });
}

async function dispatchOne(env: Env, row: ScheduledAlert) {
  const mentionText = await getMentionText(env, row);

  if (row.dispatch_to_state_alerts) {
    await rest(env, env.STATE_ALERTS_TABLE, {
      method: "POST",
      body: JSON.stringify(buildAlertInsertPayload(row)),
    });
  }

  if (row.dispatch_to_discord) {
    await rpc(env, "queue_discord_send", {
      p_state_code: row.state_code,
      p_alliance_code: "",
      p_kind: "state_alerts",
      p_channel_id: String(row.discord_channel_id || "").trim(),
      p_message: buildDiscordMessage(row, mentionText, env),
    });
  }

  await markSent(env, row.id);
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const jobs = await claimDueJobs(env, 25);

      for (const row of jobs) {
        try {
          const wonClaim = await claimOne(env, row.id);
          if (!wonClaim) continue;
          await dispatchOne(env, row);
        } catch (e: any) {
          await markFailed(env, row.id, String(e?.message || e || "Unknown error"));
        }
      }
    })());
  },
};
