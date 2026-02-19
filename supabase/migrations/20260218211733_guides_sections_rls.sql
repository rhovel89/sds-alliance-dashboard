-- SAFE RLS: allow members to READ guide sections; allow Owner/R4/R5 (and app admins) to WRITE sections.
-- Creates policies only if missing. Applies to whichever sections table exists among common names.

do $$
declare
  t text;
  col text;
  col_udt text;
  is_uuid boolean := false;
  admin_prefix text := '';
begin
  -- Optional app-admin bypass (only if function exists)
  if to_regprocedure('public.is_app_admin(uuid)') is not null then
    admin_prefix := 'public.is_app_admin(auth.uid()) OR ';
  end if;

  foreach t in array ARRAY[
    'alliance_guide_sections',
    'alliance_guides_sections',
    'guide_sections',
    'guide_section',
    'alliance_guide_section'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- Enable RLS
    execute format('alter table public.%I enable row level security', t);

    -- Find alliance column on the sections table
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

    --------------------------------------------------------------------
    -- SELECT: members can read + admins (if available)
    --------------------------------------------------------------------
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname='guides_sections_select_members'
    ) then
      if is_uuid then
        execute format($pol$
          create policy guides_sections_select_members
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
          create policy guides_sections_select_members
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

    --------------------------------------------------------------------
    -- WRITE: Owner/R4/R5 can insert/update/delete (FOR ALL), + admins
    -- NOTE: FOR ALL is required (can't do "for insert, update, delete")
    --------------------------------------------------------------------
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname='guides_sections_manage_r4r5'
    ) then
      if is_uuid then
        execute format($pol$
          create policy guides_sections_manage_r4r5
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
          create policy guides_sections_manage_r4r5
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
end $$;
