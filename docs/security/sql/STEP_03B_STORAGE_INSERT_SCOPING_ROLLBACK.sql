-- Rollback for Step 03B — restores previous broad INSERT policies.
-- WARNING: emergency-only; this reopens anonymous uploads across user_uploads.

begin;

drop policy if exists "user_uploads_insert_authenticated_scoped" on storage.objects;
drop policy if exists "legacy_admin_browser_image_insert" on storage.objects;

create policy "full lhe90e_0"
on storage.objects
for insert
to public
with check (bucket_id = 'user_uploads');

create policy "Usuarios autenticados podem enviar imagens"
on storage.objects
for insert
to public
with check (
  bucket_id = 'user_uploads'
  and auth.role() = 'authenticated'
);

commit;
