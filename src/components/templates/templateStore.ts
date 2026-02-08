import { supabase } from "../../lib/supabaseClient";

export async function runEventTemplate(templateId: string, runDate?: string) {
  const effectiveDate =
    runDate ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc(
    "generate_event_from_template",
    {
      p_template_id: templateId,
      p_run_date: effectiveDate,
    }
  );

  if (error) {
    console.error("Template run failed:", error);
    throw error;
  }

  return data;
}

// 🔁 Compatibility export
export async function runTemplate(templateId: string, runDate?: string) {
  return runEventTemplate(templateId, runDate);
}
