import { supabase } from "../lib/supabaseClient";

export default function OwnerControlPanel() {
  async function runTemplateTest() {
    const templateId = "<TEMPLATE_ID>"; // replace with real template id
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.rpc(
      "generate_event_from_template",
      {
        p_template_id: templateId,
        p_run_date: today
      }
    );

    if (error) {
      alert("Generation failed: " + error.message);
    } else if (!data) {
      alert("Already generated for today");
    } else {
      alert("Event generated: " + data);
    }
  }

  return (
    <div className="panel scanner">
      <h2>👑 Overseer Control Panel</h2>

      <p>Restricted systems access.</p>

      <hr />

      {/* TEMP: Template execution test */}
      <h3>🧪 Template Test Runner</h3>

      <button onClick={runTemplateTest}>
        Run Template (Today)
      </button>

    </div>
  );
}
