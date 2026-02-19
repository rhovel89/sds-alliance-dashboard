-- SAFE RLS:
-- - Guide sections: members READ, Owner/R4/R5 WRITE (+ app admins if is_app_admin exists)
-- - Alliance events: members READ, Owner/R4/R5 WRITE (+ app admins)
-- - If a table has created_by uuid column, set default to auth.uid() (helps inserts succeed)
-- Creates policies only if missing.

do $$
declare
  admin_prefix text := '';
  t text;
  col text;
  col_udt text;
  is_uuid boolean := false;
  has_created_by boolean := false;
begin
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  --------------------------------------------------------------------
  -- GUIDE SECTIONS TABLES (try common names)
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

    -- alliance column
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

    -- created_by default (if column exists)
    select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='created_by' and udt_name='uuid'
    ) into has_created_by;

    if has_created_by then
      begin
        execute format('alter table public.%I alter column created_by set default auth.uid()', t);
      exception when others then
        -- ignore if can't set
        null;
      end;
    end if;

    -- SELECT members
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='gs_select_members'
    ) then
      if is_uuid then
        execute format($pol$
          create policy gs_select_members
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
          create policy gs_select_members
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

    -- WRITE managers (FOR ALL)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='gs_manage_r4r5'
    ) then
      if is_uuid then
        execute format($pol$
          create policy gs_manage_r4r5
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
          create policy gs_manage_r4r5
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

    raise notice 'Guide sections RLS OK on % (alliance column %)', t, col;
  end loop;

  --------------------------------------------------------------------
  -- ALLIANCE EVENTS TABLE (common name: alliance_events)
  --------------------------------------------------------------------
  if to_regclass('public.alliance_events') is not null then
    execute 'alter table public.alliance_events enable row level security';

    -- find alliance column
    select c.column_name, c.udt_name
      into col, col_udt
    from information_schema.columns c
    where c.table_schema='public'
      and c.table_name='alliance_events'
      and c.column_name in ('alliance_code','alliance_id','alliance')
    order by case c.column_name
      when 'alliance_code' then 1
      when 'alliance_id' then 2
      else 3
    end
    limit 1;

    if col is not null then
      is_uuid := (col_udt = 'uuid');

      -- members can read events
      if not exists (
        select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_select_members'
      ) then
        if is_uuid then
          execute format($pol$
            create policy ae_select_members
            on public.alliance_events
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
          $pol$, admin_prefix, col);
        else
          execute format($pol$
            create policy ae_select_members
            on public.alliance_events
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
          $pol$, admin_prefix, col);
        end if;
      end if;

      -- managers can write
      if not exists (
        select 1 from pg_policies where schemaname='public' and tablename='alliance_events' and policyname='ae_manage_r4r5'
      ) then
        if is_uuid then
          execute format($pol$
            create policy ae_manage_r4r5
            on public.alliance_events
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
          $pol$, admin_prefix, col, admin_prefix, col);
        else
          execute format($pol$
            create policy ae_manage_r4r5
            on public.alliance_events
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
          $pol$, admin_prefix, col, admin_prefix, col);
        end if;
      end if;

      raise notice 'Alliance events RLS OK (alliance column %)', col;
    else
      raise notice 'alliance_events exists but no alliance column found';
    end if;
  end if;

end $$;
