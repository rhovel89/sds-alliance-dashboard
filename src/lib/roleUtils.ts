export function canOwnerBypass(
  isOwner: boolean,
  role?: string,
  locked?: boolean
) {
  if (isOwner) return true;
  if (locked) return false;
  return role === 'R5' || role === 'R4';
}