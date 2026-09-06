-- Step 05F — Low-risk indexes for messaging / notification hot paths

begin;

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id)
  where user_id is not null;

commit;
