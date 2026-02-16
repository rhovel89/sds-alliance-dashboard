-- Alliance Announcements + Guides (per alliance)
-- - Announcements: readable by alliance members; writable by Owner/R5/R4 + app admins
-- - Guides: sections (readonly/discussion); posts (threads+replies); attachments (images)
-- - Storage bucket: alliance-guides (private) with RLS based on alliance membership + section mode

-- Safety: require pgcrypto for gen_random_uuid (usually already present)
create extension if not exists pgcrypto;

-- -------------------------
-- Helper: current_player_id()
-- tries players.auth_user_id first, then player_auth_links.user_id
-- -------------------------
create or replace function public.current_player_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  begin
    select p.id into pid
    from public.players p
    where p.auth_user_id = auth.uid()
    limit 1;
  exception when undefined_column then
    pid := null;
  end;

  if pid is not null then
    return pid;
  end if;

  begin
    select l.player_id into pid
    from public.player_auth_links l
    where l.user_id = auth.uid()
    limit 1;
  exception when others then
    pid := null;
  end;

  return pid;
end $$;

-- -------------------------
-- Helper: is_alliance_member(code)
-- -------------------------
create or replace function public.is_alliance_member(p_alliance_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_alliances pa
    where pa.alliance_code = upper(btrim(p_alliance_code))
      and pa.player_id = public.current_player_id()
  );
$$;

-- -------------------------
-- Helper: is_alliance_role(code, roles[])
-- roles are compared case-insensitive
-- -------------------------
create or replace function public.is_alliance_role(p_alliance_code text, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_alliances pa
    where pa.alliance_code = upper(btrim(p_alliance_code))
      and pa.player_id = public.current_player_id()
      and lower(pa.role) = any (select lower(x) from unnest(p_roles) as x)
  );
$$;

-- =========================================================
-- A) Alliance Announcements
-- =========================================================
create table if not exists public.alliance_announcements (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  title text not null,
  body text null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create index if not exists alliance_announcements_alliance_code_idx
  on public.alliance_announcements(alliance_code);

alter table public.alliance_announcements enable row level security;

drop policy if exists alliance_announcements_select on public.alliance_announcements;
drop policy if exists alliance_announcements_write on public.alliance_announcements;

create policy alliance_announcements_select
on public.alliance_announcements
for select
to authenticated
using (
  public.is_alliance_member(alliance_code)
  or public.is_app_admin(auth.uid())
);

create policy alliance_announcements_write
on public.alliance_announcements
for all
to authenticated
using (
  public.is_app_admin(auth.uid())
  or public.is_alliance_role(alliance_code, array['owner','r5','r4'])
)
with check (
  public.is_app_admin(auth.uid())
  or public.is_alliance_role(alliance_code, array['owner','r5','r4'])
);

-- =========================================================
-- B) Guides Notebook (per alliance)
-- =========================================================

create table if not exists public.guide_sections (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  title text not null,
  description text null,
  mode text not null default 'discussion',
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now()
);

-- Ensure mode is valid (safe if already exists)
do $$
begin
  begin
    alter table public.guide_sections
      drop constraint if exists guide_sections_mode_check;
  exception when others then null; end;

  begin
    alter table public.guide_sections
      add constraint guide_sections_mode_check
      check (mode in ('readonly','discussion'));
  exception when others then null; end;
end $$;

create index if not exists guide_sections_alliance_code_idx
  on public.guide_sections(alliance_code);

create table if not exists public.guide_posts (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  parent_id uuid null references public.guide_posts(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create index if not exists guide_posts_section_idx on public.guide_posts(section_id);
create index if not exists guide_posts_parent_idx on public.guide_posts(parent_id);

create table if not exists public.guide_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.guide_posts(id) on delete cascade,
  bucket_id text not null default 'alliance-guides',
  object_path text not null,
  mime_type text null,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create index if not exists guide_attachments_post_idx on public.guide_attachments(post_id);

alter table public.guide_sections enable row level security;
alter table public.guide_posts enable row level security;
alter table public.guide_attachments enable row level security;

drop policy if exists guide_sections_select on public.guide_sections;
drop policy if exists guide_sections_write on public.guide_sections;
drop policy if exists guide_posts_select on public.guide_posts;
drop policy if exists guide_posts_insert on public.guide_posts;
drop policy if exists guide_posts_update on public.guide_posts;
drop policy if exists guide_posts_delete on public.guide_posts;
drop policy if exists guide_attachments_select on public.guide_attachments;
drop policy if exists guide_attachments_insert on public.guide_attachments;
drop policy if exists guide_attachments_delete on public.guide_attachments;

-- Sections: read by members, write by Owner/R5/R4 + app admin
create policy guide_sections_select
on public.guide_sections
for select
to authenticated
using (
  public.is_alliance_member(alliance_code)
  or public.is_app_admin(auth.uid())
);

create policy guide_sections_write
on public.guide_sections
for all
to authenticated
using (
  public.is_app_admin(auth.uid())
  or public.is_alliance_role(alliance_code, array['owner','r5','r4'])
)
with check (
  public.is_app_admin(auth.uid())
  or public.is_alliance_role(alliance_code, array['owner','r5','r4'])
);

-- Posts: read by members
create policy guide_posts_select
on public.guide_posts
for select
to authenticated
using (
  exists (
    select 1 from public.guide_sections s
    where s.id = guide_posts.section_id
      and (public.is_alliance_member(s.alliance_code) or public.is_app_admin(auth.uid()))
  )
);

-- Insert rules:
-- - app admin always
-- - Owner/R5/R4 always (even readonly)
-- - if section is discussion: any alliance member can post
create policy guide_posts_insert
on public.guide_posts
for insert
to authenticated
with check (
  public.is_app_admin(auth.uid())
  or exists (
    select 1 from public.guide_sections s
    where s.id = guide_posts.section_id
      and public.is_alliance_role(s.alliance_code, array['owner','r5','r4'])
  )
  or exists (
    select 1 from public.guide_sections s
    where s.id = guide_posts.section_id
      and s.mode = 'discussion'
      and public.is_alliance_member(s.alliance_code)
  )
);

-- Update: app admin OR Owner/R5/R4 OR author (only in discussion)
create policy guide_posts_update
on public.guide_posts
for update
to authenticated
using (
  public.is_app_admin(auth.uid())
  or exists (
    select 1 from public.guide_sections s
    where s.id = guide_posts.section_id
      and public.is_alliance_role(s.alliance_code, array['owner','r5','r4'])
  )
  or (
    guide_posts.created_by = auth.uid()
    and exists (
      select 1 from public.guide_sections s
      where s.id = guide_posts.section_id and s.mode = 'discussion'
    )
  )
)
with check (true);

-- Delete: app admin OR Owner/R5/R4 OR author (discussion)
create policy guide_posts_delete
on public.guide_posts
for delete
to authenticated
using (
  public.is_app_admin(auth.uid())
  or exists (
    select 1 from public.guide_sections s
    where s.id = guide_posts.section_id
      and public.is_alliance_role(s.alliance_code, array['owner','r5','r4'])
  )
  or (
    guide_posts.created_by = auth.uid()
    and exists (
      select 1 from public.guide_sections s
      where s.id = guide_posts.section_id and s.mode = 'discussion'
    )
  )
);

-- Attachments: readable by members (via post->section->alliance)
create policy guide_attachments_select
on public.guide_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.guide_posts p
    join public.guide_sections s on s.id = p.section_id
    where p.id = guide_attachments.post_id
      and (public.is_alliance_member(s.alliance_code) or public.is_app_admin(auth.uid()))
  )
);

-- Insert attachments allowed if user can post in that section
create policy guide_attachments_insert
on public.guide_attachments
for insert
to authenticated
with check (
  public.is_app_admin(auth.uid())
  or exists (
    select 1
    from public.guide_posts p
    join public.guide_sections s on s.id = p.section_id
    where p.id = guide_attachments.post_id
      and (
        public.is_alliance_role(s.alliance_code, array['owner','r5','r4'])
        or (s.mode='discussion' and public.is_alliance_member(s.alliance_code))
      )
  )
);

create policy guide_attachments_delete
on public.guide_attachments
for delete
to authenticated
using (
  public.is_app_admin(auth.uid())
  or exists (
    select 1
    from public.guide_posts p
    join public.guide_sections s on s.id = p.section_id
    where p.id = guide_attachments.post_id
      and public.is_alliance_role(s.alliance_code, array['owner','r5','r4'])
  )
);

-- =========================================================
-- Storage bucket + policies (best-effort)
-- bucket_id = 'alliance-guides'
-- object path convention used by UI:
--   {ALLIANCE_CODE}/{SECTION_ID}/{POST_ID}/{UUID}_{FILENAME}
-- =========================================================

do $$
begin
  -- Create bucket row if it doesn't exist (schema may differ; swallow errors safely)
  begin
    if not exists (select 1 from storage.buckets where id = 'alliance-guides') then
      insert into storage.buckets (id, name, public)
      values ('alliance-guides', 'alliance-guides', false);
    end if;
  exception when others then
    null;
  end;
end $$;

-- Policies on storage.objects (RLS already enabled by Supabase)
do $$
begin
  begin execute 'drop policy if exists alliance_guides_objects_select on storage.objects'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_guides_objects_insert on storage.objects'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_guides_objects_update on storage.objects'; exception when others then null; end;
  begin execute 'drop policy if exists alliance_guides_objects_delete on storage.objects'; exception when others then null; end;

  execute $p$
    create policy alliance_guides_objects_select
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'alliance-guides'
      and (
        public.is_app_admin(auth.uid())
        or public.is_alliance_member(split_part(name,'/',1))
      )
    )
  $p$;

  -- insert allowed if:
  -- - app admin OR
  -- - section is readonly -> only Owner/R5/R4
  -- - section is discussion -> members can upload too
  execute $p$
    create policy alliance_guides_objects_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'alliance-guides'
      and (
        public.is_app_admin(auth.uid())
        or exists (
          select 1 from public.guide_sections s
          where s.id::text = split_part(name,'/',2)
            and upper(btrim(s.alliance_code)) = upper(btrim(split_part(name,'/',1)))
            and (
              public.is_alliance_role(split_part(name,'/',1), array['owner','r5','r4'])
              or (s.mode='discussion' and public.is_alliance_member(split_part(name,'/',1)))
            )
        )
      )
    )
  $p$;

  execute $p$
    create policy alliance_guides_objects_update
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'alliance-guides'
      and (
        public.is_app_admin(auth.uid())
        or public.is_alliance_role(split_part(name,'/',1), array['owner','r5','r4'])
      )
    )
    with check (true)
  $p$;

  execute $p$
    create policy alliance_guides_objects_delete
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'alliance-guides'
      and (
        public.is_app_admin(auth.uid())
        or public.is_alliance_role(split_part(name,'/',1), array['owner','r5','r4'])
      )
    )
  $p$;
end $$;

-- Best-effort schema cache refresh
do $$
begin
  begin
    perform pg_notify('pgrst', 'reload schema');
  exception when others then null;
  end;
end $$;
