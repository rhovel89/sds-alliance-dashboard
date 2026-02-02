import { usePermission } from "../hooks/usePermission";
import { useHQMap } from "../hooks/useHQMap";

export default function HQMap({ allianceId }: { allianceId: string }) {
  const canEdit = usePermission("manage_hq_map");
  const { hqList, loading } = useHQMap(allianceId);

  if (loading) return <p>Loading HQ map…</p>;

  return (
    <div style={{ padding: 32 }}>
      <h2>HQ Map</h2>

      {canEdit && (
        <p style={{ color: "green" }}>
          You can edit this HQ map.
        </p>
      )}

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Player</th>
            <th>HQ</th>
            <th>X</th>
            <th>Y</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          {hqList.map(hq => (
            <tr key={hq.id}>
              <td>{hq.player_name}</td>
              <td>{hq.hq_label || "-"}</td>
              <td>{hq.coord_x}</td>
              <td>{hq.coord_y}</td>
              <td>{hq.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!canEdit && (
        <p style={{ marginTop: 16 }}>
          Read-only view. Contact leadership to make changes.
        </p>
      )}
    </div>
  );
}
