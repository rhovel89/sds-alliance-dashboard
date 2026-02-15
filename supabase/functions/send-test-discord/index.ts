import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function buildPing(roleIdRaw: string | null) {
  const roleId = (roleIdRaw ?? "").toString().trim();

  if (!roleId) return { prefix: "", allowed_mentions: { parse: [] as string[] } };

  // Normal role mention
  return {
    prefix: `<@&${roleId}> `,
    allowed_mentions: { parse: [] as string[], roles: [roleId] as string[] },
  };
}

serve(async (req) => {
  try {
    const { alliance_id } = await req.json().catch(() => ({}));
    const aid = (alliance_id ?? "").toString().trim().toUpperCase();
    if (!aid) return new Response("alliance_id required", { status: 400 });

    // Identify caller (JWT from browser)
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!jwt) return new Response("Missing Authorization", { status: 401 });

    // Create a user-scoped client to check RLS/admin
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const me = await userClient.auth.getUser();
    const uid = me.data.user?.id;
    if (!uid) return new Response("Not logged in", { status: 401 });

    const admin = await userClient
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    if (!admin.data) return new Response("Forbidden", { status: 403 });

    // Load discord config via service role (table is admin-only in RLS; service role bypasses)
    const { data: cfg, error } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled")
      .eq("alliance_id", aid)
      .maybeSingle();

    if (error) return new Response(error.message, { status: 500 });
    if (!cfg) return new Response("Alliance not configured", { status: 404 });
    if (cfg.enabled === false) return new Response("Alliance disabled", { status: 400 });

    const ping = buildPing(cfg.role_id);

    const res = await fetch(cfg.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${ping.prefix}🧪 Test ping from Owner Dashboard for **${cfg.alliance_id}**`,
        allowed_mentions: ping.allowed_mentions,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return new Response(`Discord error ${res.status}: ${txt}`, { status: 500 });
    }

    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
});
