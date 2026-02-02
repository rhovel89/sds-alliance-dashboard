type Achievement = {
  id: string;
  name: string;
  progress: number;
  goal: number;
};

export default function AchievementPanel({ items }: { items: Achievement[] }) {
  return (
    <div>
      <h2>Achievements</h2>
      {items.map(a => (
        <div key={a.id}>
          {a.name}: {a.progress}/{a.goal}
        </div>
      ))}
    </div>
  );
}
