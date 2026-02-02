import { ReactNode } from 'react';
import { usePermissions } from '../contexts/PermissionContext';

export default function AccessBoundary({
  permission,
  children
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) return null;
  return <>{children}</>;
}
