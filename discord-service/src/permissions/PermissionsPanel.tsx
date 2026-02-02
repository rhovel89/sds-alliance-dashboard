import { usePermissions } from '../contexts/PermissionContext';

export default function PermissionsPanel() {
  const { permissions, hasPermission } = usePermissions();

  if (!hasPermission('owner:permissions')) {
    return <p>Access denied.</p>;
  }

  return (
    <div>
      <h2>Permissions Management</h2>
      <p>Permission assignment UI scaffolded.</p>
    </div>
  );
}
