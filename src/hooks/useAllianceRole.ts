import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type RoleState = {
  loading: boolean;
  role: string | null;
  sourceTable: string | null;
  error: string | null;
  canEditGuides: boolean;
};

const MEMBERSHIP_TABLE_CANDIDATES = [
  "alliance_memberships",
  "alliance_members",
  "memberships",
  "alliance_users",
];

function normalizeRole(role: unknown): string {
  const s = (role ?? "").toString().trim().toLowerCase();
  if (s === "5" || s === "r5" || s === "rank5") return "r5";
  if (s === "4" || s === "r4" || s === "rank4") return "r4";
  if (s === "owner") return "owner";
  if (s === "dashboard_assist" || s === "dashboard assist") return "dashboard_assist";
  return s;
}

function canEditFromRole(roleNorm: string): boolean {
  return roleNorm === "owner" || roleNorm === "r5" || roleNorm === "r4";
}

function looksLikeMissingTable(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("404") ||
    m.includes("not found") ||
    m.includes("relation") && m.includes("does not exist") ||
    m.includes("does not exist")
  );
}

export function useAllianceRole(allianceCode: string | null | undefined): RoleState {
  const [state, setState] = useState<RoleState>({
    loading: true,
    role: null,
    sourceTable: null,
    error: null,
    canEditGuides: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!allianceCode) {
        if (!cancelled) {
          setState({
            loading: false,
            role: null,
            sourceTable: null,
            error: null,
            canEditGuides: false,
          });
        }
        return;
      }

      if (!cancelled) {
        setState((s) => ({ ...s, loading: true, error: null }));
      }

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userErr || !userRes?.user) {
        setState({
          loading: false,
          role: null,
          sourceTable: null,
          error: userErr?.message || null,
          canEditGuides: false,
        });
        return;
      }

      const userId = userRes.user.id;

      for (const table of MEMBERSHIP_TABLE_CANDIDATES) {
        const { data, error } = await supabase
          .from(table)
          .select("role")
          .eq("user_id", userId)
          .eq("alliance_code", allianceCode)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          const msg = (error as any).message || "";
          // If the table doesn't exist in this project, try the next candidate.
          if (looksLikeMissingTable(msg)) continue;

          setState({
            loading: false,
            role: null,
            sourceTable: table,
            error: msg,
            canEditGuides: false,
          });
          return;
        }

        const roleNorm = normalizeRole((data as any)?.role);
        setState({
          loading: false,
          role: roleNorm || null,
          sourceTable: table,
          error: null,
          canEditGuides: canEditFromRole(roleNorm),
        });
        return;
      }

      // None of the candidate tables worked
      setState({
        loading: false,
        role: null,
        sourceTable: null,
        error: "No membership table found (update MEMBERSHIP_TABLE_CANDIDATES in useAllianceRole.ts).",
        canEditGuides: false,
      });
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [allianceCode]);

  return state;
}