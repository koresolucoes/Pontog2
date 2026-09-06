-- Step 05D — Notification preferences / push subscription least privilege

begin;

-- notification_preferences is a user-facing settings surface.
-- Clients only need to read/update their own rows; defaults are created server-side.
revoke all on table public.notification_preferences from anon;
revoke all on table public.notification_preferences from authenticated;
grant select, update on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_preferences to service_role;

drop policy if exists "Users can manage their own notification preferences" on public.notification_preferences;
drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;

create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Push subscription persistence is server-mediated only.
revoke all on table public.push_subscriptions from anon;
revoke all on table public.push_subscriptions from authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

drop policy if exists "Allow users to delete their own subscription" on public.push_subscriptions;
drop policy if exists "Allow users to insert their own subscription" on public.push_subscriptions;
drop policy if exists "Allow users to read their own subscriptions" on public.push_subscriptions;
drop policy if exists "Allow users to update their own subscription" on public.push_subscriptions;

-- Defaults are an internal backend operation. Keep the function invoker-security:
-- the service role already has the required table grants and bypasses RLS.
create or replace function public.ensure_default_notification_preferences(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_notification_type text;
begin
  if p_user_id is null then
    raise exception 'User id is required.' using errcode = '22004';
  end if;

  foreach v_notification_type in array array['new_message', 'new_wink', 'new_album_request']::text[]
  loop
    insert into public.notification_preferences (user_id, notification_type, enabled)
    values (p_user_id, v_notification_type::notification_type, true)
    on conflict (user_id, notification_type) do nothing;
  end loop;
end;
$function$;

revoke execute on function public.ensure_default_notification_preferences(uuid) from public;
revoke execute on function public.ensure_default_notification_preferences(uuid) from anon;
revoke execute on function public.ensure_default_notification_preferences(uuid) from authenticated;
grant execute on function public.ensure_default_notification_preferences(uuid) to service_role;

commit;
