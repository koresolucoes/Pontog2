-- Rollback Step 05F

begin;

drop index if exists public.messages_sender_id_idx;
drop index if exists public.push_subscriptions_user_id_idx;

commit;
