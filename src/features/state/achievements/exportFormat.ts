export type AchievementRow = {
  id: string;
  player_game_name?: string | null;
  game_name?: string | null;
  status?: string | null;

  achievement_name?: string | null;
  achievement_title?: string | null;
  title?: string | null;
  type_name?: string | null;
  option_name?: string | null;

  state_achievement_types?: { name?: string | null; title?: string | null } | null;
  state_achievement_options?: { name?: string | null; title?: string | null } | null;
};

export function getPlayerName(row: AchievementRow): string {
  return (
    row.player_game_name?.trim() ||
    row.game_name?.trim() ||
    "Unknown Player"
  );
}

export function getAchievementName(row: AchievementRow): string {
  return (
    row.achievement_name?.trim() ||
    row.achievement_title?.trim() ||
    row.title?.trim() ||
    row.state_achievement_options?.title?.trim() ||
    row.state_achievement_options?.name?.trim() ||
    row.state_achievement_types?.title?.trim() ||
    row.state_achievement_types?.name?.trim() ||
    row.option_name?.trim() ||
    row.type_name?.trim() ||
    "Achievement"
  );
}

export function formatAchievementLine(row: AchievementRow): string {
  return `• ${getPlayerName(row)}: ${getAchievementName(row)}`;
}
