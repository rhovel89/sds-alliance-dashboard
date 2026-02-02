import { supabase } from '../lib/supabaseClient';

export function logAction(action: string) {
  supabase.from('audit_log').insert({ action });
}
