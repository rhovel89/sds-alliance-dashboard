import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export type PlayerHQ = {
  id: string;
  allianceCode: string;       // alliance_id (text) in your HQ tables
  label?: string | null;
  slotNumber?: number | null;
  slotX?: number | null;
  slotY?: number | null;
  playerX?: number | null;
  playerY?: number | null;
  updatedAt?: string | null;
  source: "alliance_hq_map" | "alliance_hq_positions";
};

export type AllianceInfo = {
  code: string;
  name?: string | null;
};

export function usePlayerHQs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hqs, setHqs] = useState<PlayerHQ[]>([]);
  const [alliances, setAlliances] = useState<Record<string, AllianceInfo>>({});

  const allianceCodes = useMemo(() => {
    return Array.from(new Set((hqs || []).map(h => String(h.allianceCode || "").toUpperCase()).filter(Boolean)));
  }, [hqs]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: uRes, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        const uid = uRes?.user?.id;
        if (!uid) throw new Error("Not signed in.");

        // 1) Primary: alliance_hq_map (assigned_user_id)
        const { data: mapRows, error: mapErr } = await supabase
          .from("alliance_hq_map")
          .select("id,alliance_id,label,slot_number,slot_x,slot_y,player_x,player_y,updated_at,assigned_user_id,player_hq_id")
          .eq("assigned_user_id", uid);

        if (mapErr && mapErr.code !== "PGRST116") {
          // PGRST116 can happen if RLS blocks; we still try fallback
          console.warn("alliance_hq_map error:", mapErr);
        }

        const mapHQs: PlayerHQ[] = (mapRows || []).map((r: any) => ({
          id: String(r.id),
          allianceCode: String(r.alliance_id || "").toUpperCase(),
          label: r.label ?? null,
          slotNumber: (typeof r.slot_number === "number" ? r.slot_number : null),
          slotX: (typeof r.slot_x === "number" ? r.slot_x : null),
          slotY: (typeof r.slot_y === "number" ? r.slot_y : null),
          playerX: (typeof r.player_x === "number" ? r.player_x : null),
          playerY: (typeof r.player_y === "number" ? r.player_y : null),
          updatedAt: r.updated_at ?? null,
          source: "alliance_hq_map",
        })).filter(x => x.allianceCode);

        // 2) Fallback: alliance_hq_positions (user_id)
        const { data: posRows, error: posErr } = await supabase
          .from("alliance_hq_positions")
          .select("id,alliance_id,x,y,updated_at,user_id")
          .eq("user_id", uid);

        if (posErr && posErr.code !== "PGRST116") {
          console.warn("alliance_hq_positions error:", posErr);
        }

        const posHQs: PlayerHQ[] = (posRows || []).map((r: any) => ({
          id: String(r.id),
          allianceCode: String(r.alliance_id || "").toUpperCase(),
          label: null,
          slotNumber: null,
          slotX: null,
          slotY: null,
          playerX: (typeof r.x === "number" ? r.x : null),
          playerY: (typeof r.y === "number" ? r.y : null),
          updatedAt: r.updated_at ?? null,
          source: "alliance_hq_positions",
        })).filter(x => x.allianceCode);

        // Merge + de-dupe (prefer alliance_hq_map)
        const merged = [...mapHQs];
        const keySet = new Set(merged.map(h => h.allianceCode + "|" + (h.playerX ?? "") + "|" + (h.playerY ?? "")));

        for (const h of posHQs) {
          const k = h.allianceCode + "|" + (h.playerX ?? "") + "|" + (h.playerY ?? "");
          if (!keySet.has(k)) {
            merged.push(h);
            keySet.add(k);
          }
        }

        if (!cancelled) setHqs(merged);

      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!allianceCodes.length) { setAlliances({}); return; }

      try {
        // Best-effort: pull names from alliances table if present
        const { data, error } = await supabase
          .from("alliances")
          .select("code,name")
          .in("code", allianceCodes);

        if (error) {
          // If schema differs, we still work fine without names
          console.warn("alliances lookup error:", error);
          return;
        }

        const map: Record<string, AllianceInfo> = {};
        for (const r of (data || []) as any[]) {
          const code = String(r.code || "").toUpperCase();
          if (!code) continue;
          map[code] = { code, name: r.name ?? null };
        }
        if (!cancelled) setAlliances(map);
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [allianceCodes.join("|")]);

  return { loading, error, hqs, alliances };
}
