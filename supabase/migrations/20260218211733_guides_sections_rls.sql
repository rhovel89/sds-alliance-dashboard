-- SAFE RLS: allow members to READ guide sections; allow Owner/R4/R5 (and app admins) to WRITE sections.
-- Does not drop/overwrite existing policies; creates only if missing.
-- Also adds an extra policy so R4/R5 can WRITE alliance_events (without touching existing policies).

do $$
declare
  t text;
  col text;
  col_udt text;
  is_uuid boolean := false;
  admin_prefix text := '';
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  --------------------------------------------------------------------
  -- GUIDE SECTIONS (try common table names)
  --------------------------------------------------------------------
  foreach t in array ARRAY[
    'alliance_guide_sections',
    'alliance_guides_sections',
    'guide_sections',
    'guide_section',
    'alliance_guide_section',
    'alliance_guide_sections_v2'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Find alliance column
    select c.column_name, c.udt_name
      into col, col_udt
    from information_schema.columns c
    where c.table_schema='public'
      and c.table_name=t
      and c.column_name in ('alliance_code','alliance_id','alliance')
    order by case c.column_name
      when 'alliance_code' then 1
      when 'alliance_id' then 2
      else 3
    end
    limit 1;

    if col is null then
      raise notice 'Skipping %, no alliance column found', t;
      continue;
    end if;

    is_uuid := (col_udt = 'uuid');

    -- SELECT: members can read (plus app admins if function exists)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname='gs_select_members_v2'
    ) then
      if is_uuid then
        execute format($pol$
          create policy gs_select_members_v2
          on public.%I
          for select
          using (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances al on al.code = pa.alliance_code
              where me.auth_user_id = auth.uid()
                and al.id = %I
            )
          )
        $pol$, t, admin_prefix, col);
      else
        execute format($pol$
          create policy gs_select_members_v2
          on public.%I
          for select
          using (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and pa.alliance_code = %I
            )
          )
        $pol$, t, admin_prefix, col);
      end if;
    end if;

    -- WRITE: Owner/R4/R5 can insert/update/delete (plus app admins)
    -- IMPORTANT: use "FOR ALL" (no commas)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname='gs_manage_r4r5_v2'
    ) then
      if is_uuid then
        execute format($pol$
          create policy gs_manage_r4r5_v2
          on public.%I
          for all
          using (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances al on al.code = pa.alliance_code
              where me.auth_user_id = auth.uid()
                and al.id = %I
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              join public.alliances al on al.code = pa.alliance_code
              where me.auth_user_id = auth.uid()
                and al.id = %I
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $pol$, t, admin_prefix, col, admin_prefix, col);
      else
        execute format($pol$
          create policy gs_manage_r4r5_v2
          on public.%I
          for all
          using (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and pa.alliance_code = %I
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
          with check (
            %s exists (
              select 1
              from public.players me
              join public.player_alliances pa on pa.player_id = me.id
              where me.auth_user_id = auth.uid()
                and pa.alliance_code = %I
                and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
            )
          )
        $pol$, t, admin_prefix, col, admin_prefix, col);
      end if;
    end if;

    raise notice 'Guide sections RLS verified on table % (alliance col %)', t, col;
  end loop;

  --------------------------------------------------------------------
  -- ALLIANCE EVENTS: add a policy so R4/R5 can WRITE (without touching existing)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='alliance_events' and policyname='ae_manage_r4r5_v2'
    ) then
      execute $pol$
        create policy ae_manage_r4r5_v2
        on public.alliance_events
        for all
        using (
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        )
        with check (
          (to_regprocedure('public.is_app_admin(uuid)') is not null and public.is_app_admin(auth.uid()))
          or exists (
            select 1
            from public.players me
            join public.player_alliances pa on pa.player_id = me.id
            where me.auth_user_id = auth.uid()
              and pa.alliance_code = alliance_events.alliance_id
              and lower(coalesce(pa.role,'')) in ('owner','r4','r5')
          )
        );
      $pol$;
    end if;
  end if;

end $$;
