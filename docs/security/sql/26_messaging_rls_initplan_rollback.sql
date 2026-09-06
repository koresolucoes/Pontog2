-- Step 07C rollback — restore exact pre-cleanup messaging policies.

drop policy if exists "Permitir que usuários vejam suas próprias participações" on public.conversation_participants;
create policy "Permitir que usuários vejam suas próprias participações"
on public.conversation_participants for select to public
using (auth.uid() = user_id);

drop policy if exists "Allow read access to own conversations" on public.conversations;
create policy "Allow read access to own conversations"
on public.conversations for select to public
using (
  id in (
    select conversation_participants.conversation_id
    from public.conversation_participants
    where conversation_participants.user_id = auth.uid()
  )
);

drop policy if exists "Allow read access to messages in own conversations" on public.messages;
create policy "Allow read access to messages in own conversations"
on public.messages for select to public
using (
  conversation_id in (
    select conversation_participants.conversation_id
    from public.conversation_participants
    where conversation_participants.user_id = auth.uid()
  )
);

drop policy if exists "Allow update on own messages" on public.messages;
create policy "Allow update on own messages"
on public.messages for update to public
using (sender_id = auth.uid());

drop policy if exists "Allow delete on own messages" on public.messages;
create policy "Allow delete on own messages"
on public.messages for delete to public
using (sender_id = auth.uid());
