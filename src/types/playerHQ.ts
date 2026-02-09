export interface PlayerHQ {
  id?: string;
  hq_name: string;
  hq_level: number;
  troop_type: 'Shooter' | 'Fighter' | 'Rider';
  troop_tier: 'T5' | 'T6' | 'T7' | 'T8' | 'T9' | 'T10' | 'T11' | 'T12' | 'T13' | 'T14';
  march_size: number;
  rally_size: number;
  current_lair_level: number;
  hq_map_slot?: number;
}
