-- Rollback for Step 03A — restores prior permissive mutation policies.
-- WARNING: this intentionally reopens anonymous Storage mutation and is emergency-only.

begin;

create policy "full l34pk4_0" on storage.objects for insert to public with check (bucket_id = 'news_images');
create policy "full l34pk4_1" on storage.objects for update to public using (bucket_id = 'news_images');
create policy "full l34pk4_2" on storage.objects for delete to public using (bucket_id = 'news_images');

create policy "public imags 1lgvc9w_1" on storage.objects for insert to public with check (bucket_id = 'venues');
create policy "public imags 1lgvc9w_2" on storage.objects for update to public using (bucket_id = 'venues');
create policy "public imags 1lgvc9w_3" on storage.objects for delete to public using (bucket_id = 'venues');

create policy "full lhe90e_2" on storage.objects for update to public using (bucket_id = 'user_uploads');
create policy "full lhe90e_3" on storage.objects for delete to public using (bucket_id = 'user_uploads');

drop policy if exists "user_uploads_delete_own" on storage.objects;
create policy "Usuarios podem deletar suas proprias imagens"
on storage.objects for delete to public
using ((bucket_id = 'user_uploads') and (auth.uid() = owner));

commit;
