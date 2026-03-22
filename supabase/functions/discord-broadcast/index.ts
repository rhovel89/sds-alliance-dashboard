const buildDiscordPayload = (payload: any) => {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const content = String(base.content ?? base.message ?? "");

  base.content = content;

  const roleIds = Array.from(
    new Set(
      [...content.matchAll(/<@&(\d+)>/g)].map((m) => m[1])
    )
  );

  base.allowed_mentions = {
    parse: ["users"],
    roles: roleIds,
  };

  if ("message" in base) delete base.message;

  return base;
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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


async function resolveDiscordRoleTokensFromDb(input: string, stateCode: string, allianceCode: string): Promise<string> {
  const source = String(input ?? "");
  if (!/{{\s*role\s*:/i.test(source)) return source;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const norm = (v: any) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const lut = new Map<string, string>();

  const addRows = (rows: any[] | null | undefined) => {
    for (const row of (rows ?? [])) {
      const id = [
        row?.discord_role_id,
        row?.role_id,
        row?.discord_id,
        row?.mention_id,
        row?.target_id,
        row?.snowflake,
      ]
        .map((v) => String(v ?? "").trim())
        .find((v) => /^\d{5,}$/.test(v));

      if (!id) continue;

      [
        row?.role_key,
        row?.role_name,
        row?.display_name,
        row?.name,
        row?.label,
        row?.title,
      ]
        .map(norm)
        .filter(Boolean)
        .forEach((k) => {
          if (!lut.has(k)) lut.set(k, id);
        });
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

  return source.replace(/{{\s*role\s*:\s*([^}]+)\s*}}/gi, (full, rawKey) => {
    const id = lut.get(norm(rawKey));
    return id ? `<@&${id}>` : full;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { ok: false, error: "Missing SUPABASE_URL/ANON_KEY" });
  if (!DISCORD_BOT_TOKEN) return json(500, { ok: false, error: "Missing DISCORD_BOT_TOKEN secret" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "Missing Authorization Bearer token" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Validate JWT
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json(401, { ok: false, error: "Invalid session" });

  // Require app admin OR dashboard owner
  const { data: isOwner } = await supabase.rpc("is_dashboard_owner");
  const { data: isAdmin } = await supabase.rpc("is_app_admin");
  if (!(isOwner === true || isAdmin === true)) return json(403, { ok: false, error: "Forbidden" });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const channelId = String(body?.channelId || body?.channel_id || "").trim();
  const content = String(body?.content || body?.message || "").trim();
  const dryRun = body?.dryRun === true || body?.dry_run === true;

  if (!/^\d{10,30}$/.test(channelId)) return json(400, { ok: false, error: "channelId must be numeric" });
  if (!content) return json(400, { ok: false, error: "content is required" });
  if (content.length > 2000) return json(400, { ok: false, error: "content too long (max 2000)" });

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
        content: await resolveDiscordRoleTokensFromDb(
          String(content ?? ""),
          String(body?.state_code ?? body?.p_state_code ?? body?.meta?.state_code ?? "789"),
          String(body?.alliance_code ?? body?.p_alliance_code ?? body?.meta?.alliance_code ?? "")
        ),
      allowed_mentions: { parse: ["roles", "users"], replied_user: false },
    })),
  });

  const txt = await resp.text();
  if (!resp.ok) {
    return json(502, {
      ok: false,
      stage: "discord-api",
      error: "Discord API error",
      status: resp.status,
      body: txt,
      channelId,
    });
  }

  let data: any = null;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

  return json(200, {
    ok: true,
    stage: "sent",
    channelId,
    discord: data,
    discordRaw: txt,
  });
});





