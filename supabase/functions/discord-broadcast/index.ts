import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const buildDiscordPayload = (payload: any) => {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const content = String(base.content ?? base.message ?? "");

  base.content = content;

  const roleIds = Array.from(
    new Set(
      [...content.matchAll(/<@&(\d+)>/g)].map((m) => m[1]),
    ),
  );

  base.allowed_mentions = {
    parse: ["users"],
    roles: roleIds,
  };

  if ("message" in base) delete base.message;

  return base;
};

async function resolveDiscordRoleTokensFromDb(
  input: string,
  stateCode: string,
  allianceCode: string,
): Promise<string> {
  const source = String(input ?? "");
  if (!/{{\s*role\s*:/i.test(source)) return source;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return source;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const norm = (v: any) =>
    String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  const lut = new Map<string, string>();

  const addRows = (rows: any[] | null | undefined) => {
    for (const row of rows ?? []) {
      const id = [
        row?.discord_role_id,
        row?.role_id,
        row?.discord_id,
        row?.mention_id,
        row?.target_id,
        row?.snowflake,
      ]
        .map((v) => String(v ?? "").trim())
        .find(Boolean);

      if (!id) continue;

      [
        row?.role_key,
        row?.role_name,
        row?.display_name,
        row?.name,
        row?.label,
        row?.title,
      ]
        .map((v) => norm(v))
        .filter(Boolean)
        .forEach((key) => lut.set(key, id));
    }
  };

  try {
    const { data } = await supabaseAdmin
      .from("alliance_discord_role_mentions")
      .select("*")
      .eq("alliance_code", String(allianceCode ?? "").toUpperCase());
    addRows(data as any[]);
  } catch {}

  try {
    const { data } = await supabaseAdmin
      .from("state_discord_role_mentions")
      .select("*")
      .eq("state_code", String(stateCode ?? "789"));
    addRows(data as any[]);
  } catch {}

  try {
    const { data } = await supabaseAdmin
      .from("discord_role_mentions")
      .select("*");
    addRows(data as any[]);
  } catch {}

  return source.replace(/{{\s*role\s*:\s*([^}]+?)\s*}}/gi, (full, rawKey) => {
    const id = lut.get(norm(rawKey));
    return id ? `<@&${id}>` : full;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  if (!DISCORD_BOT_TOKEN) {
    return json(500, { ok: false, error: "DISCORD_BOT_TOKEN is missing" });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const channelId = String(
    body?.channelId ??
    body?.channel_id ??
    body?.p_channel_id ??
    "",
  ).trim();

  let content = String(
    body?.content ??
    body?.message ??
    body?.p_message ??
    body?.p_content ??
    "",
  ).trim();

  const dryRun = body?.dryRun === true || body?.dry_run === true;

  if (!/^\d{10,30}$/.test(channelId)) {
    return json(400, { ok: false, error: "channelId must be numeric" });
  }

  if (!content) {
    return json(400, { ok: false, error: "content is required" });
  }

  if (content.length > 2000) {
    return json(400, { ok: false, error: "content too long (max 2000)" });
  }

  content = await resolveDiscordRoleTokensFromDb(
    content,
    String(body?.state_code ?? body?.p_state_code ?? body?.meta?.state_code ?? "789"),
    String(body?.alliance_code ?? body?.p_alliance_code ?? body?.meta?.alliance_code ?? ""),
  );

  if (dryRun) {
    return json(200, { ok: true, dryRun: true, channelId, preview: content });
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDiscordPayload({
      content,
      allowed_mentions: { parse: ["roles", "users"], replied_user: false },
    })),
  });

  const txt = await resp.text();

  let data: any = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  if (!resp.ok) {
    return json(resp.status, {
      ok: false,
      error: "Discord send failed",
      discord: data,
    });
  }

  return json(200, { ok: true, discord: data });
});
