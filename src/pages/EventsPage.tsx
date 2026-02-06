import PlannerGrid from '../components/events/PlannerGrid';
import { useAlliance } from '../context/AllianceContext';

export default function EventsPage({ events = [], timezone = 'local' }: any) {
  const { allianceId, loading } = useAlliance();

  if (loading) {
    return <div style={{ padding: 20 }}>Loading events…</div>;
  }

  if (!allianceId) {
    return <div style={{ padding: 20 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 20, pointerEvents: 'auto' }}>
      <PlannerGrid events={events} timezone={timezone} />
    </div>
  );
}
