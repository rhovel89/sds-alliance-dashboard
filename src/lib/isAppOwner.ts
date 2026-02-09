import { supabase } from './supabaseClient';

export async function isAppOwner(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from('app_owners')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Owner check failed:', error);
    return false;
  }

  return !!data;
}