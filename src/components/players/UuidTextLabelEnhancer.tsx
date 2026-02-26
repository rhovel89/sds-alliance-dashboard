import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type LinkRow = { player_id: string; user_id: string };

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const UUID_FULL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function short(u: string) {
  return u.slice(0, 8) + "…" + u.slice(-4);
}

function buildMap(players: PlayerRow[], links: LinkRow[]) {
  const uuidToName: Record<string, string> = {};
  const playerIdToName: Record<string, string> = {};

  for (const p of players) {
    const display = (p.name || p.game_name || "").toString().trim();
    if (!display) continue;
    playerIdToName[p.id] = display;
    uuidToName[p.id] = display; // player_id
    if (p.auth_user_id) uuidToName[p.auth_user_id] = display; // primary auth user
  }

  for (const l of links) {
    const display = playerIdToName[l.player_id];
    if (display && l.user_id) uuidToName[l.user_id] = display; // linked auth user
  }

  return uuidToName;
}

export default function UuidTextLabelEnhancer() {
  const loc = useLocation();

  // Only on /owner/memberships
  const enabled = useMemo(() => loc.pathname === "/owner/memberships", [loc.pathname]);

  const [map, setMap] = useState<Record<string, string>>({});
  const doneNodes = useRef<WeakSet<Text>>(new WeakSet());

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const pRes = await supabase.from("players").select("id,name,game_name,auth_user_id");
        const lRes = await supabase.from("player_auth_links").select("player_id,user_id");

        const players = (pRes.data ?? []) as PlayerRow[];
        const links = (lRes.data ?? []) as LinkRow[];

        const m = buildMap(players, links);
        if (!cancelled) setMap(m);
      } catch {
        if (!cancelled) setMap({});
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  function shouldSkip(el: HTMLElement | null) {
    if (!el) return true;
    const tag = (el.tagName || "").toUpperCase();
    // avoid mutating form controls or code/pre blocks
    return ["INPUT","TEXTAREA","SELECT","OPTION","SCRIPT","STYLE","CODE","PRE"].includes(tag);
  }

  function replaceInTextNode(node: Text) {
    if (doneNodes.current.has(node)) return;

    const parent = node.parentElement;
    if (shouldSkip(parent)) return;

    const txt = node.nodeValue || "";
    if (!txt) return;

    // quick exit if no uuid
    if (!UUID_RE.test(txt)) return;

    // reset regex state
    UUID_RE.lastIndex = 0;

    let changed = false;
    const next = txt.replace(UUID_RE, (uuid) => {
      const u = uuid.trim();
      if (!UUID_FULL_RE.test(u)) return uuid;

      const name = map[u];
      if (!name) return uuid;

      changed = true;
      return `${name} (${short(u)})`;
    });

    if (changed) {
      node.nodeValue = next;
      doneNodes.current.add(node);
    }
  }

  function scan() {
    if (!enabled) return;
    const keys = Object.keys(map || {});
    if (!keys.length) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null = walker.nextNode();
    while (n) {
      replaceInTextNode(n as Text);
      n = walker.nextNode();
    }
  }

  useEffect(() => {
    if (!enabled) return;

    // scan immediately + a few times (if content loads async)
    scan();
    const iv = window.setInterval(scan, 800);

    const to = window.setTimeout(() => {
      window.clearInterval(iv);
    }, 12000);

    const obs = new MutationObserver(() => scan());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, map]);

  return null;
}
