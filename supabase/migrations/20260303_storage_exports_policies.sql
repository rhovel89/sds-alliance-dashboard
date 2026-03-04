-- ================================
-- Storage policies for exports bucket
-- Allow app admins to upload/overwrite/delete exports
-- ================================

-- Ensure bucket exists + is public (read)
insert into storage.buckets (id, name, public)
values ('exports','exports', true)
on conflict (id) do update set public = excluded.public;

-- IMPORTANT: Policies are evaluated using the user's JWT (auth.uid()) at runtime.

-- Allow app admins to INSERT new export objects
drop policy if exists "exports_admin_insert" on storage.objects;
create policy "exports_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exports'
  and public.is_app_admin()
);

-- Allow app admins to UPDATE (needed for upload with upsert:true)
drop policy if exists "exports_admin_update" on storage.objects;
create policy "exports_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exports'
  and public.is_app_admin()
)
with check (
  bucket_id = 'exports'
  and public.is_app_admin()
);

-- Optional: allow app admins to DELETE exports
drop policy if exists "exports_admin_delete" on storage.objects;
create policy "exports_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exports'
  and public.is_app_admin()
);

-- Optional: allow public READ listing (bucket is public anyway, but this helps some APIs)
drop policy if exists "exports_public_read" on storage.objects;
create policy "exports_public_read"
on storage.objects
for select
to public
using (bucket_id = 'exports');
