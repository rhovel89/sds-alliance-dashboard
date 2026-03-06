do $$
begin
  if to_regclass('public.player_auth_links') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_auth_links' and column_name='user_id') then
      execute 'create index if not exists idx_pal_user_id on public.player_auth_links(user_id);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_auth_links' and column_name='player_id') then
      execute 'create index if not exists idx_pal_player_id on public.player_auth_links(player_id);';
    end if;
  end if;

  if to_regclass('public.player_alliances') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliances' and column_name='player_id') then
      execute 'create index if not exists idx_pa_player_id on public.player_alliances(player_id);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliances' and column_name='alliance_code') then
      execute 'create index if not exists idx_pa_alliance_code on public.player_alliances(alliance_code);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliances' and column_name='role') then
      execute 'create index if not exists idx_pa_role on public.player_alliances(role);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliances' and column_name='player_id')
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_alliances' and column_name='alliance_code') then
      execute 'create index if not exists idx_pa_player_alliance on public.player_alliances(player_id, alliance_code);';
    end if;
  end if;

  if to_regclass('public.alliances') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='code') then
      execute 'create index if not exists idx_alliances_code on public.alliances(code);';
    end if;
  end if;

  if to_regclass('public.guide_sections') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_sections' and column_name='alliance_code') then
      execute 'create index if not exists idx_guide_sections_alliance_code on public.guide_sections(alliance_code);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_sections' and column_name='alliance_id') then
      execute 'create index if not exists idx_guide_sections_alliance_id on public.guide_sections(alliance_id);';
    end if;
  end if;

  if to_regclass('public.guide_section_entries') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_section_entries' and column_name='section_id') then
      execute 'create index if not exists idx_gse_section_id on public.guide_section_entries(section_id);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_section_entries' and column_name='alliance_code') then
      execute 'create index if not exists idx_gse_alliance_code on public.guide_section_entries(alliance_code);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_section_entries' and column_name='alliance_id') then
      execute 'create index if not exists idx_gse_alliance_id on public.guide_section_entries(alliance_id);';
    end if;
  end if;

  if to_regclass('public.guide_entry_attachments') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_entry_attachments' and column_name='entry_id') then
      execute 'create index if not exists idx_gea_entry_id on public.guide_entry_attachments(entry_id);';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guide_entry_attachments' and column_name='guide_entry_id') then
      execute 'create index if not exists idx_gea_guide_entry_id on public.guide_entry_attachments(guide_entry_id);';
    end if;
  end if;
end $$;
