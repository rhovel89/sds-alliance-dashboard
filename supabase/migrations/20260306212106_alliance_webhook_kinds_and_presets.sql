-- ============================================================
-- Alliance Discord Webhook Kinds + Defaults + Mention Presets
-- Required webhook kinds: announcements, alerts, threads
-- Default mention presets: Wasteland King, Leadership, Peeps
-- ============================================================

-- 1) Kinds registry (owner/admin editable; UI can read)
create table if not exists public.discord_webhook_kinds (
  kind text primary key,
  label text not null,
  required boolean not null default false,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz null,
  updated_by uuid null
);

-- 2) Stored webhooks per alliance
create table if not exists public.alliance_discord_webhooks (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  name text not null,
  webhook_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz null,
  updated_by uuid null
);

-- 3) Default webhook per alliance + kind (the worker resolves default:<kind>)
create table if not exists public.alliance_discord_webhook_defaults (
  alliance_code text not null,
  kind text not null,
  webhook_id uuid not null references public.alliance_discord_webhooks(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz null,
  updated_by uuid null,
  primary key (alliance_code, kind)
);

-- 4) Mention presets per alliance (raw text; can be @text or <@&ROLE_ID>)
create table if not exists public.alliance_mention_presets (
  id uuid primary key default gen_random_uuid(),
  alliance_code text not null,
  preset_key text not null,
  label text not null,
  mention_text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz null,
  updated_by uuid null,
  unique (alliance_code, preset_key)
);

-- Indexes
create index if not exists idx_adw_alliance_code_upper on public.alliance_discord_webhooks ((upper(alliance_code)));
create index if not exists idx_adwd_alliance_code_upper on public.alliance_discord_webhook_defaults ((upper(alliance_code)));
create index if not exists idx_amp_alliance_code_upper on public.alliance_mention_presets ((upper(alliance_code)));

-- RLS
alter table public.discord_webhook_kinds enable row level security;
alter table public.alliance_discord_webhooks enable row level security;
alter table public.alliance_discord_webhook_defaults enable row level security;
alter table public.alliance_mention_presets enable row level security;

-- Policies: kinds (read for authed; write for owner/app admin)
drop policy if exists "kinds_read" on public.discord_webhook_kinds;
create policy "kinds_read"
on public.discord_webhook_kinds
for select
to authenticated
using (true);

drop policy if exists "kinds_write_owner_admin" on public.discord_webhook_kinds;
create policy "kinds_write_owner_admin"
on public.discord_webhook_kinds
for all
to authenticated
using (is_dashboard_owner() or is_app_admin())
with check (is_dashboard_owner() or is_app_admin());

-- Policies: per-alliance webhooks/defaults/presets (manage alliance discord settings)
drop policy if exists "alliance_webhooks_read" on public.alliance_discord_webhooks;
create policy "alliance_webhooks_read"
on public.alliance_discord_webhooks
for select
to authenticated
using (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
);

drop policy if exists "alliance_webhooks_write" on public.alliance_discord_webhooks;
create policy "alliance_webhooks_write"
on public.alliance_discord_webhooks
for all
to authenticated
using (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
)
with check (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
);

drop policy if exists "alliance_webhook_defaults_rw" on public.alliance_discord_webhook_defaults;
create policy "alliance_webhook_defaults_rw"
on public.alliance_discord_webhook_defaults
for all
to authenticated
using (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
)
with check (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
);

drop policy if exists "alliance_mention_presets_rw" on public.alliance_mention_presets;
create policy "alliance_mention_presets_rw"
on public.alliance_mention_presets
for all
to authenticated
using (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
)
with check (
  public.can_manage_alliance_discord_settings(upper(alliance_code))
  or is_dashboard_owner() or is_app_admin()
);

-- Seed required webhook kinds
insert into public.discord_webhook_kinds(kind,label,required,sort_order,active)
values
  ('announcements','Announcements',true,10,true),
  ('alerts','Alerts',true,20,true),
  ('threads','Threads',true,30,true),
  ('achievements','Achievements',false,40,true)
on conflict (kind) do nothing;

-- Seed default mention presets for ALL alliances
insert into public.alliance_mention_presets(alliance_code, preset_key, label, mention_text, active)
select upper(code), 'wasteland_king', 'Wasteland King', '@Wasteland King', true
from public.alliances
on conflict (alliance_code, preset_key) do nothing;

insert into public.alliance_mention_presets(alliance_code, preset_key, label, mention_text, active)
select upper(code), 'leadership', 'Leadership', '@Leadership', true
from public.alliances
on conflict (alliance_code, preset_key) do nothing;

insert into public.alliance_mention_presets(alliance_code, preset_key, label, mention_text, active)
select upper(code), 'peeps', 'Peeps', '@Peeps', true
from public.alliances
on conflict (alliance_code, preset_key) do nothing;

-- Views: missing requirements (so UI can display red/green without code changes later)
drop view if exists public.v_alliance_missing_webhook_defaults;
create view public.v_alliance_missing_webhook_defaults as
with req as (
  select kind from public.discord_webhook_kinds where required = true and active = true
),
alli as (
  select upper(code) as alliance_code, name as alliance_name
  from public.alliances
)
select
  a.alliance_code,
  a.alliance_name,
  r.kind as missing_kind
from alli a
cross join req r
left join public.alliance_discord_webhook_defaults d
  on upper(d.alliance_code) = a.alliance_code and d.kind = r.kind
where d.webhook_id is null;

drop view if exists public.v_alliance_missing_mention_presets;
create view public.v_alliance_missing_mention_presets as
with req as (
  select unnest(array['wasteland_king','leadership','peeps']) as preset_key
),
alli as (
  select upper(code) as alliance_code, name as alliance_name
  from public.alliances
)
select
  a.alliance_code,
  a.alliance_name,
  r.preset_key as missing_preset
from alli a
cross join req r
left join public.alliance_mention_presets p
  on upper(p.alliance_code) = a.alliance_code and p.preset_key = r.preset_key and p.active = true
where p.id is null;
