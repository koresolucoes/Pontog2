-- Rollback Step 05D — restore the previous notification surface

begin;

-- Restore previous broad role grants (kept only for emergency rollback parity).
grant select, insert, update, delete, truncate, references, trigger
  on table public.notification_preferences to anon, authenticated, service_role;

grant select, insert, update, delete, truncate, references, trigger
  on table public.push_subscriptions to anon, authenticated, service_role;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;

create policy "Users can manage their own notification preferences"
on public.notification_preferences
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow users to delete their own subscription"
on public.push_subscriptions
for delete
to public
using (auth.uid() = user_id);

create policy "Allow users to insert their own subscription"
on public.push_subscriptions
for insert
to public
with check (auth.uid() = user_id);

create policy "Allow users to read their own subscriptions"
on public.push_subscriptions
for select
to public
using (auth.uid() = user_id);

create policy "Allow users to update their own subscription"
on public.push_subscriptions
for update
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.ensure_default_notification_preferences(p_user_id uuid)
returns void
language plpgsql
security invoker
as $function$
declare
  v_notification_type text;
begin
  foreach v_notification_type in array array['new_message', 'new_wink', 'new_album_request']::text[]
  loop
    insert into public.notification_preferences (user_id, notification_type, enabled)
    values (p_user_id, v_notification_type::notification_type, true)
    on conflict (user_id, notification_type) do nothing;
  end loop;
end;
$function$;

grant execute on function public.ensure_default_notification_preferences(uuid) to public, anon, authenticated, service_role;

commit;
