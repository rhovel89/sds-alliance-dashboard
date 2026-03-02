import { useCallback, useEffect, useState } from "react";

export type AllianceInvite = {
  id: string;
  token?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  alliance_id?: string | null;
  alliance_code?: string | null;
  note?: string | null;
};

export type UseAllianceInvitesResult = {
  invites: AllianceInvite[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // placeholder ops (wired later)
  createInvite: (args?: any) => Promise<void>;
  revokeInvite: (id: string) => Promise<void>;
};

export function useAllianceInvites(_allianceId?: string): UseAllianceInvitesResult {
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Stub: keep build stable. Real implementation restored/wired later.
    setLoading(false);
    setError(null);
    setInvites([]);
  }, []);

  const createInvite = useCallback(async (_args?: any) => {
    // Stub
    return;
  }, []);

  const revokeInvite = useCallback(async (_id: string) => {
    // Stub
    return;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { invites, loading, error, refresh, createInvite, revokeInvite };
}

// Default export for legacy imports (OwnerInvites.tsx expects default)
export default useAllianceInvites;

// Named compat export for code that imports { useAllianceInvites }
export { useAllianceInvites as useAllianceInvitesCompat };
