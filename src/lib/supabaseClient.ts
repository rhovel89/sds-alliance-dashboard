const safeStorage: Storage | undefined =
  typeof window === "undefined"
    ? undefined
    : (() => {
        // Prefer localStorage; fallback to sessionStorage (works for PKCE across redirect)
        try {
          const t = "__sb_test__";
          window.localStorage.setItem(t, "1");
          window.localStorage.removeItem(t);
          return window.localStorage;
        } catch {
          try {
            const t = "__sb_test__";
            window.sessionStorage.setItem(t, "1");
            window.sessionStorage.removeItem(t);
            return window.sessionStorage;
          } catch {
            return undefined;
          }
        }
      })();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: safeStorage
  }
});



