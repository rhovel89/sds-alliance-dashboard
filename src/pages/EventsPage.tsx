import { useParams } from 'react-router-dom';
import { PlannerMonth } from '../components/events_v2/PlannerMonth';
import '../styles/events_v2.css';

export default function EventsPage() {
  const { allianceId } = useParams<{ alliance_id: string }>();

  if (!allianceId) {
    return <div style={{ padding: '2rem' }}>Missing alliance context.</div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <PlannerMonth allianceId={allianceId} />
    </div>
  );
}
