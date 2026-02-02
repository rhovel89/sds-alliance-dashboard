import { useAlliance } from '../contexts/AllianceContext';

export default function AllianceSelector() {
  const { alliances, activeAlliance, setActiveAlliance } = useAlliance();

  if (alliances.length <= 1) return null;

  return (
    <select
      value={activeAlliance?.id || ''}
      onChange={(e) => {
        const a = alliances.find(x => x.id === e.target.value);
        if (a) setActiveAlliance(a);
      }}
    >
      <option value=''>Select Alliance</option>
      {alliances.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  );
}
