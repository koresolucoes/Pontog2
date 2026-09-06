-- Step 07C — Messaging RLS initplan cleanup.
-- Preserves authorization semantics while narrowing policies to authenticated
-- and evaluating auth.uid() once per statement.

drop policy if exists "Permitir que usuários vejam suas próprias participações" on public.conversation_participants;
create policy "Permitir que usuários vejam suas próprias participações"
on public.conversation_participants for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Allow read access to own conversations" on public.conversations;
create policy "Allow read access to own conversations"
on public.conversations for select to authenticated
using (
  id in (
    select cp.conversation_id
    from public.conversation_participants cp
    where cp.user_id = (select auth.uid())
  )
);

drop policy if exists "Allow read access to messages in own conversations" on public.messages;
create policy "Allow read access to messages in own conversations"
on public.messages for select to authenticated
using (
  conversation_id in (
    select cp.conversation_id
    from public.conversation_participants cp
    where cp.user_id = (select auth.uid())
  )
);

drop policy if exists "Allow update on own messages" on public.messages;
create policy "Allow update on own messages"
on public.messages for update to authenticated
using (sender_id = (select auth.uid()))
with check (sender_id = (select auth.uid()));

drop policy if exists "Allow delete on own messages" on public.messages;
create policy "Allow delete on own messages"
on public.messages for delete to authenticated
using (sender_id = (select auth.uid()));
