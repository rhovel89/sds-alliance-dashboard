import { Session } from '@supabase/supabase-js';

export function canEditHQ(session: Session | null, role: string | null) {
  if (!session) return false;
  if (!role) return false;

  return role === 'OWNER' || role === 'R5' || role === 'R4';
}
