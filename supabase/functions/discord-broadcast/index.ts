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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  let userId: string | null = null;
  let userError: string | null = null;

  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && authHeader) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data, error } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
      userError = error?.message ?? null;
    }
  } catch (e: any) {
    userError = String(e?.message || e);
  }

  return json(200, {
    ok: true,
    debug: {
      method: req.method,
      hasAuthorizationHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.slice(0, 20) : null,
      hasBearerPrefix: authHeader.toLowerCase().startsWith("bearer "),
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseAnonKey: !!SUPABASE_ANON_KEY,
      userId,
      userError,
      payload,
    },
  });
});
