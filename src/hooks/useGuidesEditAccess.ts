import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type GuidesAccessState = {
  loading: boolean;
  role: string | null;
  sourceTable: string | null;
  error: string | null;
  canEditGuides: boolean;
};

type Candidate = { table: string; userCol: string; allianceCol: string };

const TABLES = [
  "alliance_memberships",
  "alliance_members",
  "memberships",
  "alliance_users",
];

const USER_COLS = [
  "user_id",
  "auth_user_id",
  "profile_id",
  "player_id",
  "member_id",
];

const ALLIANCE_COLS = [
  "alliance_code",
  "alliance_id",
  "alliance",
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

function isMissingTableError(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return m.includes("404") || m.includes("not found") || (m.includes("relation") && m.includes("does not exist"));
}

function isBadColumnError(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function pickRoleFromRow(row: Record<string, any> | null): string | null {
  if (!row) return null;

  // Try common role/rank field names without failing if missing
  const raw =
    row.role ??
    row.rank ??
    row.alliance_role ??
    row.alliance_rank ??
    row.member_role ??
    row.member_rank ??
    null;

  const norm = normalizeRole(raw);
  return norm || null;
}

function buildCandidates(): Candidate[] {
  const c: Candidate[] = [];
  for (const table of TABLES) {
    for (const userCol of USER_COLS) {
      for (const allianceCol of ALLIANCE_COLS) {
        c.push({ table, userCol, allianceCol });
      }
    }
  }
  return c;
}

export function useGuidesEditAccess(allianceCode: string | null | undefined): GuidesAccessState {
  const [state, setState] = useState<GuidesAccessState>({
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

      if (!cancelled) setState((s) => ({ ...s, loading: true, error: null }));

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userErr || !userRes?.user) {
        setState({
          loading: false,
          role: null,
          sourceTable: null,
          error: userErr?.message || "Not logged in",
          canEditGuides: false,
        });
        return;
      }

      const userId = userRes.user.id;
      const candidates = buildCandidates();

      for (const cand of candidates) {
        const { table, userCol, allianceCol } = cand;

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(userCol as any, userId as any)
          .eq(allianceCol as any, allianceCode as any)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          const msg = (error as any).message || "";

          // Table doesn't exist -> try next table
          if (isMissingTableError(msg)) continue;

          // Column doesn't exist -> try next column combo
          if (isBadColumnError(msg)) continue;

          // Any other error -> stop and show it (likely RLS or schema issue)
          setState({
            loading: false,
            role: null,
            sourceTable: table,
            error: msg,
            canEditGuides: false,
          });
          return;
        }

        // No error means the query structure is valid.
        // If RLS blocks row visibility, data may be null; still valid.
        const role = pickRoleFromRow((data as any) || null);
        const canEditGuides = role ? canEditFromRole(role) : false;

        setState({
          loading: false,
          role,
          sourceTable: table,
          error: null,
          canEditGuides,
        });
        return;
      }

      setState({
        loading: false,
        role: null,
        sourceTable: null,
        error: "Could not find a membership table/column combination that matches this project schema.",
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