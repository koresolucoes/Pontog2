-- STEP 06 — SAFETY-PRESERVING COMPATIBILITY ROLLBACK
--
-- Step 06 intentionally keeps the Step 05 application contract compatible.
-- If application rollback is required, promote/revert to the previous Vercel
-- deployment and KEEP the Step 06 database hardening in place.
--
-- DO NOT restore:
--   * anon grants on social/admin tables or SECURITY DEFINER RPCs
--   * exact lat/lng discovery responses
--   * predictable admin credentials
--   * message insertion across a block
--
-- The additive columns and enum value are harmless to the Step 05 app:
--   reports.status/review metadata
--   user_connections.notification_event_id
--   notification_type.new_connection
--
-- This file is deliberately non-destructive. Run these checks after an app rollback.

select
  count(*) as connections,
  count(notification_event_id) as connections_with_event_id,
  count(distinct notification_event_id) as unique_event_ids
from public.user_connections;

select notification_type::text, count(*)
from public.notification_preferences
where notification_type::text = 'new_connection'
group by notification_type;

select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'send_wink',
    'record_profile_view',
    'get_my_winks',
    'get_my_profile_viewers',
    'get_nearby_profiles',
    'get_popular_profiles_paginated'
  )
order by p.proname;
