-- ============================
-- HARD RESET: user_roles RLS
-- ============================

alter table user_roles disable row level security;

-- DROP *ALL* POLICIES (NO EXCEPTIONS)
do $$
declare
  r record;
begin
  for r in (
    select policyname
    from pg_policies
    where tablename = 'user_roles'
  ) loop
    execute format('drop policy if exists %I on user_roles;', r.policyname);
  end loop;
end $$;

-- VERIFY CLEAN STATE
select policyname from pg_policies where tablename = 'user_roles';

-- RE-ENABLE RLS
alter table user_roles enable row level security;

-- ============================
-- SAFE POLICIES (NO JOINS)
-- ============================

create policy user_roles_self_read
on user_roles
for select
using (auth.uid() = user_id);

create policy user_roles_self_insert
on user_roles
for insert
with check (auth.uid() = user_id);

