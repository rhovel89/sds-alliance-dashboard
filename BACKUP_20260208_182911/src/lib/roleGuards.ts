export function isLeader(role?: string) {
  return role === "Owner" || role === "R5" || role === "R4";
}

export function isOwner(role?: string) {
  return role === "Owner";
}
