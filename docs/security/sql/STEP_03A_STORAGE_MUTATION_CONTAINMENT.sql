-- Step 03A — Storage mutation containment without URL/path migration
-- Keeps public READ compatibility.
-- IMPORTANT: legacy public INSERT on user_uploads remains temporarily because
-- current Admin News/Venues upload from the browser using the anon Supabase client.

begin;

-- Dedicated public asset buckets: keep read, close anonymous mutation.
drop policy if exists "full l34pk4_0" on storage.objects;
drop policy if exists "full l34pk4_1" on storage.objects;
drop policy if exists "full l34pk4_2" on storage.objects;

drop policy if exists "public imags 1lgvc9w_1" on storage.objects;
drop policy if exists "public imags 1lgvc9w_2" on storage.objects;
drop policy if exists "public imags 1lgvc9w_3" on storage.objects;

-- user_uploads: remove unrestricted UPDATE/DELETE. Keep legacy INSERT temporarily.
drop policy if exists "full lhe90e_2" on storage.objects;
drop policy if exists "full lhe90e_3" on storage.objects;

-- Replace owner delete with explicit authenticated role + initplan-friendly auth.uid().
drop policy if exists "Usuarios podem deletar suas proprias imagens" on storage.objects;
create policy "user_uploads_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user_uploads'
  and (select auth.uid()) = owner
);

commit;
