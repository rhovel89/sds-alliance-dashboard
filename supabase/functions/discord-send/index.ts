import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
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

function isDigits(x: string) {
  return /^[0-9]{8,32}$/.test(x || "");
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !anonKey) return json(500, { ok: false, error: "Missing SUPABASE env" });

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user || null;
    if (!user) return json(401, { ok: false, error: "Not authenticated" });

    // Owner/AppAdmin only
    const a = await supabase.rpc("is_app_admin" as any, {});
    const o = await supabase.rpc("is_dashboard_owner" as any, {});
    const isAdmin = a.data === true;
    const isOwner = o.data === true;
    if (!isAdmin && !isOwner) return json(403, { ok: false, error: "Forbidden (Owner/AppAdmin only)" });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return json(400, { ok: false, error: "Missing JSON body" });

    const mode = String(body.mode || "bot");
    if (mode !== "bot") return json(400, { ok: false, error: "Only mode=bot supported" });

    const channelId = String(body.channelId || "").trim();
    const content = String(body.content || "");
    const dryRun = body.dryRun === true;

    if (!isDigits(channelId)) return json(400, { ok: false, error: "Invalid channelId (digits only)" });
    if (!content.trim()) return json(400, { ok: false, error: "Empty content" });
    if (content.length > 2000) return json(400, { ok: false, error: "Content too long (Discord limit 2000)" });

    const token = Deno.env.get("DISCORD_BOT_TOKEN") || "";
    if (!token) return json(500, { ok: false, error: "DISCORD_BOT_TOKEN not set in Supabase secrets" });

    if (dryRun) {
      return json(200, {
        ok: true,
        dryRun: true,
        allowed: { isAdmin, isOwner },
        wouldSend: { channelId, contentPreview: content.slice(0, 160) },
      });
    }

    const discordUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const payload = {
      content,
      allowed_mentions: { parse: ["roles", "users"], replied_user: false },
    };

    const resp = await fetch(discordUrl, {
      method: "POST",
      headers: { "Authorization": `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = await resp.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { parsed = { raw: txt }; }

    if (!resp.ok) {
      return json(resp.status, { ok: false, error: "Discord API error", discordStatus: resp.status, discord: parsed });
    }

    return json(200, { ok: true, discordStatus: resp.status, discord: parsed });
  } catch (e) {
    return json(500, { ok: false, error: String((e as any)?.message || e) });
  }
});