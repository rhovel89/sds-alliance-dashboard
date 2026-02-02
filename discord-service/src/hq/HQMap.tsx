type HQ = {
  id: string;
  player_name: string;
  x: number;
  y: number;
};

export default function HQMap({ hqs }: { hqs: HQ[] }) {
  return (
    <div>
      <h2>HQ Map</h2>
      {hqs.map(hq => (
        <div key={hq.id}>
          {hq.player_name} — ({hq.x}, {hq.y})
        </div>
      ))}
    </div>
  );
}
