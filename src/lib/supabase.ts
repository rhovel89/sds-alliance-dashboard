/**
 * Wrapper to ensure there is only ONE Supabase client instance.
 * This avoids "Multiple GoTrueClient instances detected" and prevents runtime "createClient is not defined".
 */
import { supabase } from "./supabaseClient";

export { supabase };
export default supabase;
