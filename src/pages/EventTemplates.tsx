import { useParams } from 'react-router-dom';
import TemplateList from '../components/templates/TemplateList';

export default function EventTemplates() {
  const { allianceId } = useParams<{ alliance_id: string }>();

  if (!allianceId) {
    return <div style={{ padding: '2rem' }}>Missing alliance context.</div>;
  }

  return (
    <div className='panel scanner'>
      <h2>🧪 Event Templates</h2>
      <TemplateList allianceId={allianceId} />
    </div>
  );
}
