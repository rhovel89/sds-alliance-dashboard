import { useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TemplateEditor from './TemplateEditor';
import { runTemplate } from './templateStore';

type Template = {
  id: string;
  title: string;
  recurrence_type: string;
};

export default function TemplateList() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const { data } = await supabase
      .from('alliance_event_templates')
      .select('id,title,recurrence_type,created_at')
      .eq('alliance_id', allianceId)
      .order('created_at', { ascending: false });

    setTemplates(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [allianceId]);

  async function run(id: string) {
    setRunning(id);
    try {
      await runTemplate(id);
      alert('Template executed successfully');
    } catch (e: any) {
      alert('Execution failed');
      console.error(e);
    }
    setRunning(null);
  }

  return (
    <div>
      <TemplateEditor allianceId={allianceId} onCreated={load} />

      {loading && <div>Loading templates…</div>}

      {!loading && templates.length === 0 && (
        <div>No templates created yet.</div>
      )}

      <ul>
        {templates.map(t => (
          <li key={t.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{t.title}</strong> — {t.recurrence_type}
            <button
              style={{ marginLeft: '1rem' }}
              onClick={() => run(t.id)}
              disabled={running === t.id}
            >
              {running === t.id ? 'Running…' : 'Run'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


