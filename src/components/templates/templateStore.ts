import { supabase } from '../../lib/supabaseClient';

export async function runEventTemplate(templateId: string) {
  const { data, error } = await supabase.rpc(
    'generate_event_from_template',
    { template_id: templateId }
  );

  if (error) {
    console.error('Template run failed:', error);
    throw error;
  }

  return data;
}

// 🔁 Compatibility export for TemplateList
export async function runTemplate(templateId: string) {
  return runEventTemplate(templateId);
}
