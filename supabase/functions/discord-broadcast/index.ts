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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(200, {
      ok: false,
      debug: {
        stage: "env",
        missingSupabaseUrl: !SUPABASE_URL,
        missingSupabaseAnonKey: !SUPABASE_ANON_KEY,
        hasAuthorizationHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.slice(0, 20) : null,
        payload,
      },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();

  return json(200, {
    ok: true,
    debug: {
      hasAuthorizationHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.slice(0, 20) : null,
      hasBearerPrefix: authHeader.toLowerCase().startsWith("bearer "),
      userId: userData?.user?.id ?? null,
      userError: userErr?.message ?? null,
      payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
      payloadPreview: payload,
    },
  });
});

