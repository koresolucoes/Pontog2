-- Rollback Step 05C — Notification delivery idempotency

begin;

drop function if exists public.finish_notification_delivery(text, bigint, text, text);
drop function if exists public.claim_notification_delivery(text, bigint, uuid, uuid);
drop table if exists private.notification_deliveries;

-- Keep the private schema if another future object already uses it.
do $block$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'private'
  ) then
    execute 'drop schema if exists private';
  end if;
end;
$block$;

commit;
