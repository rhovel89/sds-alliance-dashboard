import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ ok: false, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY in function env" }, 500);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Permission gate (owner OR app admin)
    const [ownerRes, adminRes] = await Promise.all([
      sb.rpc("is_dashboard_owner" as any, {} as any),
      sb.rpc("is_app_admin" as any, {} as any),
    ]);

    const isOwner = ownerRes?.data === true;
    const isAdmin = adminRes?.data === true;

    if (!isOwner && !isAdmin) {
      return json({ ok: false, error: "Forbidden (owner/admin only)" }, 403);
    }

    const payload = await req.json().catch(() => ({} as any));
    const mode = String(payload?.mode || "bot");
    const channelId = String(payload?.channelId || "").trim();
    const content = String(payload?.content || "");

    if (mode !== "bot") return json({ ok: false, error: "Unsupported mode. Use mode='bot'." }, 400);
    if (!channelId) return json({ ok: false, error: "Missing channelId" }, 400);
    if (!content.trim()) return json({ ok: false, error: "Missing content" }, 400);

    const token = Deno.env.get("DISCORD_BOT_TOKEN") || "";
    if (!token) return json({ ok: false, error: "Missing DISCORD_BOT_TOKEN secret (set via supabase secrets set)" }, 500);

    // Discord max message length = 2000
    const safeContent = content.length > 2000 ? content.slice(0, 2000) : content;

    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: safeContent }),
    });

    const txt = await resp.text();
    let discord: any = null;
    try { discord = JSON.parse(txt); } catch { discord = { raw: txt }; }

    if (!resp.ok) {
      return json({ ok: false, error: `Discord HTTP ${resp.status}`, discord }, 502);
    }

    return json({ ok: true, discord }, 200);
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});