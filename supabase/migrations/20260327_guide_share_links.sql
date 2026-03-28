create extension if not exists pgcrypto;

create table if not exists public.guide_share_links (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  target_type text not null check (target_type in ('section', 'entry')),
  target_id uuid not null,
  share_token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz null,
  revoked_at timestamptz null,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_guide_share_links_token
  on public.guide_share_links (share_token);

create index if not exists idx_guide_share_links_target
  on public.guide_share_links (target_type, target_id);

alter table public.guide_share_links enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guide_share_links'
      and policyname = 'gsl_manage_editors'
  ) then
    execute '
      create policy gsl_manage_editors
      on public.guide_share_links
      for all
      to authenticated
      using (public.user_can_edit_guides(alliance_code))
      with check (public.user_can_edit_guides(alliance_code))
    ';
  end if;
end $$;

grant select, insert, update, delete on public.guide_share_links to authenticated;

create or replace function public.get_shared_guide(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.guide_share_links%rowtype;
begin
  select *
    into v_link
  from public.guide_share_links
  where share_token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

  if v_link.target_type = 'section' then
    return jsonb_build_object(
      'ok', true,
      'target_type', 'section',
      'alliance_code', v_link.alliance_code,
      'section',
        (
          select jsonb_build_object(
            'id', s.id,
            'alliance_code', s.alliance_code,
            'title', s.title,
            'description', s.description
          )
          from public.guide_sections s
          where s.id = v_link.target_id
        ),
      'entries',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', e.id,
                'section_id', e.section_id,
                'alliance_code', e.alliance_code,
                'title', e.title,
                'body', e.body,
                'created_at', e.created_at,
                'updated_at', e.updated_at
              )
              order by e.updated_at desc nulls last, e.created_at desc
            )
            from public.guide_section_entries e
            where e.section_id = v_link.target_id
          ),
          '[]'::jsonb
        )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'target_type', 'entry',
    'alliance_code', v_link.alliance_code,
    'entry',
      (
        select jsonb_build_object(
          'id', e.id,
          'section_id', e.section_id,
          'alliance_code', e.alliance_code,
          'title', e.title,
          'body', e.body,
          'created_at', e.created_at,
          'updated_at', e.updated_at
        )
        from public.guide_section_entries e
        where e.id = v_link.target_id
      ),
    'section',
      (
        select jsonb_build_object(
          'id', s.id,
          'alliance_code', s.alliance_code,
          'title', s.title,
          'description', s.description
        )
        from public.guide_sections s
        join public.guide_section_entries e
          on e.section_id = s.id
        where e.id = v_link.target_id
      )
  );
end;
$$;

grant execute on function public.get_shared_guide(uuid) to anon, authenticated;

notify pgrst, 'reload schema';