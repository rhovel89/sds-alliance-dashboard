import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type LinkRow = { player_id: string; user_id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function short(u: string) {
  return u.slice(0, 8) + "…" + u.slice(-4);
}

export default function UuidOptionLabelEnhancer() {
  const loc = useLocation();

  // Only enable on the 3 pages you requested
  const enabled = useMemo(() => {
    const p = loc.pathname;
    return (
      p.startsWith("/owner/permissions-matrix-v3") ||
      p.startsWith("/owner/players-link") ||
      p.startsWith("/owner/onboarding-queue")
    );
  }, [loc.pathname]);

  const [map, setMap] = useState<Record<string, string>>({});
  const ranOnce = useRef(false);

  // Load mappings: uuid -> player display name
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        // players: id (player_id) and auth_user_id (user_id)
        const pRes = await supabase
          .from("players")
          .select("id,name,game_name,auth_user_id");

        // links: user_id <-> player_id
        const lRes = await supabase
          .from("player_auth_links")
          .select("player_id,user_id");

        const players = (pRes.data ?? []) as PlayerRow[];
        const links = (lRes.data ?? []) as LinkRow[];

        const uuidToName: Record<string, string> = {};

        // Player IDs -> name
        for (const p of players) {
          const display = (p.name || p.game_name || "").toString().trim();
          if (!display) continue;
          if (p.id) uuidToName[p.id] = display;
          if (p.auth_user_id) uuidToName[p.auth_user_id] = display;
        }

        // Linked user ids -> name via player_id
        const playerIdToName: Record<string, string> = {};
        for (const p of players) {
          const display = (p.name || p.game_name || "").toString().trim();
          if (!display) continue;
          playerIdToName[p.id] = display;
        }
        for (const l of links) {
          const display = playerIdToName[l.player_id];
          if (display && l.user_id) uuidToName[l.user_id] = display;
        }

        if (!cancelled) setMap(uuidToName);
      } catch {
        // Fail silently (no breaking)
        if (!cancelled) setMap({});
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  function applyLabels() {
    if (!enabled) return;
    const uuidToName = map;
    if (!uuidToName || !Object.keys(uuidToName).length) return;

    const opts = document.querySelectorAll("select option");
    opts.forEach((opt) => {
      const el = opt as HTMLOptionElement;
      const v = (el.value || "").trim();
      if (!UUID_RE.test(v)) return;

      // If we've already labeled this option, skip
      if ((el as any).dataset?.sadLabelDone === "1") return;

      const name = uuidToName[v];
      if (!name) return;

      // Only relabel if it looks like a raw uuid label (prevent changing human labels)
      const current = (el.textContent || "").trim();
      const looksUuid = UUID_RE.test(current) || current === v || current.includes(short(v));
      if (!looksUuid) return;

      el.textContent = `${name} (${short(v)})`;
      (el as any).dataset.sadLabelDone = "1";
    });
  }

  // Observe DOM changes + run a few times
  useEffect(() => {
    if (!enabled) return;

    let obs: MutationObserver | null = null;
    let timer: number | null = null;

    const run = () => applyLabels();

    // run immediately and on a short interval (helps if options render after async)
    run();
    timer = window.setInterval(run, 800);

    // Stop the interval after a bit to avoid constant work
    window.setTimeout(() => {
      if (timer) window.clearInterval(timer);
      timer = null;
    }, 12000);

    // Mutation observer catches dropdown re-renders
    obs = new MutationObserver(() => {
      // throttle
      if (ranOnce.current) return;
      ranOnce.current = true;
      window.setTimeout(() => {
        ranOnce.current = false;
        run();
      }, 60);
    });

    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (obs) obs.disconnect();
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, map]);

  return null;
}
