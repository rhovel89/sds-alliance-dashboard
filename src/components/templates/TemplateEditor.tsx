import { useParams } from "react-router-dom";
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  alliance_id: string;
  onCreated: () => void;
};

export default function TemplateEditor({ onCreated }: Props) {
  const { allianceId } = useParams<{ alliance_id: string }>();
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState('weekly');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      alert('Template title is required');
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('alliance_event_templates')
      .insert({
      duration_minutes: 60, name: title,
        alliance_id: allianceId,
        title: title.trim(),
        recurrence_type: recurrence,
        created_by: user.id
      });

    if (error) {
      console.error('Template insert failed:', error);
      alert('Template creation failed');
    } else {
      setTitle('');
      onCreated();
    }

    setSaving(false);
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3>🧪 Create Event Template</h3>

      <input
        placeholder='Template name'
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />

      <select
        value={recurrence}
        onChange={e => setRecurrence(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      >
        <option value='daily'>Daily</option>
        <option value='weekly'>Weekly</option>
        <option value='biweekly'>Bi-Weekly</option>
        <option value='monthly'>Monthly</option>
      </select>

      <button onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Create Template'}
      </button>
    </div>
  );
}



