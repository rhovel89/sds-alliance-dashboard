import { supabase } from '../../lib/supabaseClient';

export async function runTemplate(templateId: string) {
  const { error } = await supabase.rpc('run_alliance_event_template', {
    template_id: templateId,
  });

  if (error) {
    throw error;
  }
}
