-- SAFE RLS for guide_sections:
-- - Members can READ sections for their alliance
-- - Owner/R4/R5 can INSERT/UPDATE/DELETE sections for their alliance
-- - App admins bypass if public.is_app_admin(uuid) exists
do $$
declare
  admin_prefix text := '';
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  if to_regclass('public.guide_sections') is null then
    raise notice 'guide_sections table not found; skipping.';
    return;
  end if;

  -- prerequisites
  if to_regclass('public.players') is null or to_regclass('public.player_alliances') is null then
    raise notice 'players/player_alliances missing; skipping guide_sections policies.';
    return;
  end if;

  execute 'alter table public.guide_sections enable row level security';

  -- READ: any member of alliance can read
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_sections' and policyname='gs_select_members'
  ) then
    execute format($pol$
      create policy gs_select_members
      on public.guide_sections
      for select
      using (
        %s exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = guide_sections.alliance_code
        )
      )
    $pol$, admin_prefix);
  end if;

  -- INSERT: Owner/R4/R5
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_sections' and policyname='gs_insert_r4r5'
  ) then
    execute format($pol$
      create policy gs_insert_r4r5
      on public.guide_sections
      for insert
      with check (
        %s exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = guide_sections.alliance_code
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      )
    $pol$, admin_prefix);
  end if;

  -- UPDATE: Owner/R4/R5
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_sections' and policyname='gs_update_r4r5'
  ) then
    execute format($pol$
      create policy gs_update_r4r5
      on public.guide_sections
      for update
      using (
        %s exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = guide_sections.alliance_code
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      )
      with check (
        %s exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = guide_sections.alliance_code
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      )
    $pol$, admin_prefix, admin_prefix);
  end if;

  -- DELETE: Owner/R4/R5
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='guide_sections' and policyname='gs_delete_r4r5'
  ) then
    execute format($pol$
      create policy gs_delete_r4r5
      on public.guide_sections
      for delete
      using (
        %s exists (
          select 1
          from public.players me
          join public.player_alliances pa on pa.player_id = me.id
          where me.auth_user_id = auth.uid()
            and pa.alliance_code = guide_sections.alliance_code
            and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
        )
      )
    $pol$, admin_prefix);
  end if;

  raise notice 'guide_sections RLS policies verified.';
end $$;