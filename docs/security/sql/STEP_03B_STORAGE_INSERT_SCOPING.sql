-- Step 03B — Scope Storage INSERT without changing current application paths.
-- Temporary compatibility: Admin News/Venues still upload from an anon Supabase client.
-- Their access is restricted to the exact legacy prefixes and image extensions.

begin;

-- Remove broad public insert and old role-check policy.
drop policy if exists "full lhe90e_0" on storage.objects;
drop policy if exists "Usuarios autenticados podem enviar imagens" on storage.objects;

-- Authenticated user media: own UUID prefix, plus current venue suggestion path.
create policy "user_uploads_insert_authenticated_scoped"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user_uploads'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or name like 'venues/venue\_%' escape '\'
  )
);

-- TEMPORARY bridge only. Remove after Admin uses signed upload through Media Engine.
create policy "legacy_admin_browser_image_insert"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'user_uploads'
  and (
    name like 'news_images/admin\_%' escape '\'
    or name like 'venues/admin\_%' escape '\'
  )
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
);

commit;
