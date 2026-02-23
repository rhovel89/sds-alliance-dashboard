-- Fix: approve_access_request RPC expects decided_by on access_requests
alter table public.access_requests
  add column if not exists decided_by uuid;

-- Optional but useful (many approval flows expect these too)
alter table public.access_requests
  add column if not exists decided_at timestamptz;

alter table public.access_requests
  add column if not exists decision text;

-- (Optional) index for filtering approvals quickly
create index if not exists access_requests_decision_idx
  on public.access_requests (decision, decided_at);
