import { useParams } from 'react-router-dom';
import TemplateList from '../components/templates/TemplateList';

export default function EventTemplates() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: '2rem' }}>Missing alliance context.</div>;
  }

  return (
    <div className='panel scanner'>
      <h2>🧪 Event Templates</h2>
      <TemplateList alliance_id={alliance_id} />
    </div>
  );
}
