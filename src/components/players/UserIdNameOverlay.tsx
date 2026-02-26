import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = { id: string; name: string | null; game_name: string | null; auth_user_id: string | null };
type LinkRow = { player_id: string; user_id: string };

const UUID_FULL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANY_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function short(u: string) {
  return u.slice(0, 8) + "…" + u.slice(-4);
}

function shouldSkipElement(el: HTMLElement | null) {
  if (!el) return true;
  const tag = (el.tagName || "").toUpperCase();
  return ["INPUT","TEXTAREA","SELECT","OPTION","SCRIPT","STYLE","CODE","PRE"].includes(tag);
}

export default function UserIdNameOverlay() {
  const loc = useLocation();

  // Optional: allow disabling via localStorage for debugging
  const enabled = useMemo(() => {
    try { return localStorage.getItem("sad_name_overlay_off_v1") !== "1"; } catch { return true; }
  }, [loc.pathname]);

  const [map, setMap] = useState<Record<string, string>>({});
  const processedTextNodes = useRef<WeakSet<Text>>(new WeakSet());

  // Load mapping once per session (refresh-safe)
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const pRes = await supabase.from("players").select("id,name,game_name,auth_user_id");
        const lRes = await supabase.from("player_auth_links").select("player_id,user_id");

        // If RLS blocks these tables, just fail silently (no breaking)
        if (pRes.error) return;
        const players = (pRes.data ?? []) as PlayerRow[];
        const links = (lRes.data ?? []) as LinkRow[];

        const playerIdToName: Record<string, string> = {};
        for (const p of players) {
          const display = (p.name || p.game_name || "").toString().trim();
          if (!display) continue;
          playerIdToName[p.id] = display;
        }

        const uidToName: Record<string, string> = {};
        for (const p of players) {
          const display = (p.name || p.game_name || "").toString().trim();
          if (!display) continue;
          // Map primary auth user id -> name
          if (p.auth_user_id) uidToName[p.auth_user_id] = display;
        }

        // Map linked auth user ids -> player name via player_id
        for (const l of links) {
          const display = playerIdToName[l.player_id];
          if (display && l.user_id) uidToName[l.user_id] = display;
        }

        if (!cancelled) setMap(uidToName);
      } catch {
        if (!cancelled) setMap({});
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  function replaceTextNode(node: Text) {
    if (!enabled) return;
    if (processedTextNodes.current.has(node)) return;

    const parent = node.parentElement;
    if (shouldSkipElement(parent)) return;

    const txt = node.nodeValue || "";
    if (!txt) return;

    // fast exit
    if (!UUID_ANY_RE.test(txt)) return;
    UUID_ANY_RE.lastIndex = 0;

    let changed = false;
    const next = txt.replace(UUID_ANY_RE, (uuid) => {
      const u = uuid.trim();
      if (!UUID_FULL_RE.test(u)) return uuid;

      const name = map[u];
      if (!name) return uuid;

      changed = true;
      return `${name} (${short(u)})`;
    });

    if (changed) {
      node.nodeValue = next;
      processedTextNodes.current.add(node);
    }
  }

  function relabelOptions() {
    if (!enabled) return;
    const keys = Object.keys(map || {});
    if (!keys.length) return;

    const opts = document.querySelectorAll("select option");
    opts.forEach((opt) => {
      const el = opt as HTMLOptionElement;
      const v = (el.value || "").trim();
      if (!UUID_FULL_RE.test(v)) return;

      const name = map[v];
      if (!name) return;

      const current = (el.textContent || "").trim();
      // Only rewrite if it looks like raw uuid already
      if (!UUID_FULL_RE.test(current) && !current.includes(short(v)) && current !== v) return;

      if ((el as any).dataset?.sadLabelDone === "1") return;

      el.textContent = `${name} (${short(v)})`;
      (el as any).dataset.sadLabelDone = "1";
    });
  }

  function scanAll() {
    if (!enabled) return;
    const keys = Object.keys(map || {});
    if (!keys.length) return;

    // Update dropdown option labels
    relabelOptions();

    // Update visible text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null = walker.nextNode();
    while (n) {
      replaceTextNode(n as Text);
      n = walker.nextNode();
    }
  }

  useEffect(() => {
    if (!enabled) return;

    // initial + periodic (for async-loaded content)
    scanAll();
    const iv = window.setInterval(scanAll, 800);

    // stop interval after a bit (reduce overhead)
    const to = window.setTimeout(() => window.clearInterval(iv), 15000);

    // observe DOM changes (react rerenders)
    const obs = new MutationObserver(() => scanAll());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, map, loc.pathname]);

  return null;
}
