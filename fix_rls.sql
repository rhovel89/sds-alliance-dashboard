-- ============================
-- TEMPORARILY DISABLE RLS
-- ============================
alter table user_roles disable row level security;
alter table onboarding_requests disable row level security;

-- ============================
-- DROP BROKEN POLICIES
-- ============================
drop policy if exists "read own roles" on user_roles;
drop policy if exists "manage own roles" on user_roles;
drop policy if exists "onboarding read" on onboarding_requests;

-- ============================
-- RE-ENABLE RLS
-- ============================
alter table user_roles enable row level security;
alter table onboarding_requests enable row level security;

-- ============================
-- SAFE NON-RECURSIVE POLICIES
-- ============================

create policy "user_roles_self_read"
on user_roles
for select
using (auth.uid() = user_id);

create policy "onboarding_self_read"
on onboarding_requests
for select
using (auth.uid() = user_id);

create policy "onboarding_self_insert"
on onboarding_requests
for insert
with check (auth.uid() = user_id);
