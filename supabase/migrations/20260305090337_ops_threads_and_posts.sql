create extension if not exists pgcrypto;

create table if not exists public.ops_threads (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('state','alliance')),
  state_code text,
  alliance_code text,

  title text not null,
  body text not null,
  tags jsonb not null default '[]'::jsonb,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_thread_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ops_threads(id) on delete cascade,
  body text not null,

  created_by uuid not null,
  created_at timestamptz not null default now()
);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ops_threads_set_updated_at on public.ops_threads;
create trigger trg_ops_threads_set_updated_at
before update on public.ops_threads
for each row execute function public.tg_set_updated_at();

alter table public.ops_threads enable row level security;
alter table public.ops_thread_posts enable row level security;

-- Threads SELECT:
--  - alliance threads: members can read
--  - state threads: staff (state_achievement_access) can read
drop policy if exists "ops_threads_select" on public.ops_threads;
create policy "ops_threads_select"
on public.ops_threads
for select
to authenticated
using (
  (scope = 'alliance' and exists (
    select 1 from public.my_player_alliances a
    where a.alliance_code = ops_threads.alliance_code
  ))
  OR
  (scope = 'state' and exists (
    select 1 from public.state_achievement_access s
    where s.user_id = auth.uid() and s.state_code = ops_threads.state_code
  ))
  OR created_by = auth.uid()
);

-- Threads INSERT:
drop policy if exists "ops_threads_insert" on public.ops_threads;
create policy "ops_threads_insert"
on public.ops_threads
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    (scope = 'alliance' and exists (
      select 1 from public.my_player_alliances a
      where a.alliance_code = ops_threads.alliance_code
    ))
    OR
    (scope = 'state' and exists (
      select 1 from public.state_achievement_access s
      where s.user_id = auth.uid() and s.state_code = ops_threads.state_code
    ))
  )
);

-- Threads UPDATE/DELETE: creator OR alliance leadership OR state staff
drop policy if exists "ops_threads_update" on public.ops_threads;
create policy "ops_threads_update"
on public.ops_threads
for update
to authenticated
using (
  created_by = auth.uid()
  OR (scope = 'alliance' and exists (
    select 1 from public.my_player_alliances a
    where a.alliance_code = ops_threads.alliance_code
      and a.role in ('owner','r5','r4')
  ))
  OR (scope = 'state' and exists (
    select 1 from public.state_achievement_access s
    where s.user_id = auth.uid() and s.state_code = ops_threads.state_code
  ))
)
with check (true);

drop policy if exists "ops_threads_delete" on public.ops_threads;
create policy "ops_threads_delete"
on public.ops_threads
for delete
to authenticated
using (
  created_by = auth.uid()
  OR (scope = 'alliance' and exists (
    select 1 from public.my_player_alliances a
    where a.alliance_code = ops_threads.alliance_code
      and a.role in ('owner','r5','r4')
  ))
  OR (scope = 'state' and exists (
    select 1 from public.state_achievement_access s
    where s.user_id = auth.uid() and s.state_code = ops_threads.state_code
  ))
);

-- Posts SELECT/INSERT based on ability to read thread; update/delete only creator
drop policy if exists "ops_posts_select" on public.ops_thread_posts;
create policy "ops_posts_select"
on public.ops_thread_posts
for select
to authenticated
using (
  exists (
    select 1 from public.ops_threads t
    where t.id = ops_thread_posts.thread_id
      and (
        (t.scope = 'alliance' and exists (
          select 1 from public.my_player_alliances a
          where a.alliance_code = t.alliance_code
        ))
        OR
        (t.scope = 'state' and exists (
          select 1 from public.state_achievement_access s
          where s.user_id = auth.uid() and s.state_code = t.state_code
        ))
        OR t.created_by = auth.uid()
      )
  )
);

drop policy if exists "ops_posts_insert" on public.ops_thread_posts;
create policy "ops_posts_insert"
on public.ops_thread_posts
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.ops_threads t
    where t.id = ops_thread_posts.thread_id
      and (
        (t.scope = 'alliance' and exists (
          select 1 from public.my_player_alliances a
          where a.alliance_code = t.alliance_code
        ))
        OR
        (t.scope = 'state' and exists (
          select 1 from public.state_achievement_access s
          where s.user_id = auth.uid() and s.state_code = t.state_code
        ))
        OR t.created_by = auth.uid()
      )
  )
);

drop policy if exists "ops_posts_update" on public.ops_thread_posts;
create policy "ops_posts_update"
on public.ops_thread_posts
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "ops_posts_delete" on public.ops_thread_posts;
create policy "ops_posts_delete"
on public.ops_thread_posts
for delete
to authenticated
using (created_by = auth.uid());

grant select, insert, update, delete on public.ops_threads to authenticated;
grant select, insert, update, delete on public.ops_thread_posts to authenticated;
