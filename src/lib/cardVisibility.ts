import { isLeader } from "./roleGuards";

export function canSeeSensitiveCards(role?: string) {
  return isLeader(role);
}
