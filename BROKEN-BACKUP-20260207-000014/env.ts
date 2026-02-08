export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  SITE_URL: import.meta.env.VITE_SITE_URL,
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.error("❌ ENV MISSING AT BUILD TIME", ENV);
  throw new Error("Supabase env vars missing — check Cloudflare Production envs");
}

console.log("✅ ENV LOADED AT BUILD", {
  hasUrl: !!ENV.SUPABASE_URL,
  hasAnon: !!ENV.SUPABASE_ANON_KEY,
});

(window as any).__ENV__ = ENV;
