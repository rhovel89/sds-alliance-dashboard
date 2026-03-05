-- Compatibility shim: some UI queries public.player_hqs(id,created_at,updated_at)
-- This prevents PostgREST "schema cache" table-not-found errors.
-- We will extend this table later with proper columns + RLS rules.

create table if not exists public.player_hqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_player_hqs_set_updated_at on public.player_hqs;
create trigger trg_player_hqs_set_updated_at
before update on public.player_hqs
for each row execute function public.tg_set_updated_at();

alter table public.player_hqs enable row level security;

-- Minimal policies: table currently holds only ids/timestamps.
-- We can tighten later once we add real linkage columns.
drop policy if exists "player_hqs_select_authed" on public.player_hqs;
create policy "player_hqs_select_authed"
on public.player_hqs
for select
to authenticated
using (true);
