-- Step 07A.2 rollback — recreate only the exact duplicate policies removed by forward migration.

create policy "Allow read access to conversation participants"
on public.conversations for select to public
using (
  id in (
    select conversation_participants.conversation_id
    from public.conversation_participants
    where conversation_participants.user_id = auth.uid()
  )
);

create policy "Inserção autenticada em venue_review_replies"
on public.venue_review_replies for insert to authenticated
with check (auth.uid() = user_id);

create policy "Leitura pública de venue_review_replies"
on public.venue_review_replies for select to public
using (true);

create policy "Inserção autenticada em venue_reviews"
on public.venue_reviews for insert to authenticated
with check (auth.uid() = user_id);

create policy "Leitura pública de venue_reviews"
on public.venue_reviews for select to public
using (true);

create policy "Qualquer um pode ver as curtidas dos vídeos"
on public.video_likes for select to public
using (true);

create policy "Permitir exclusão de avaliações para donos do registro"
on public.video_ratings for delete to public
using (auth.uid() = user_id);

create policy "Permitir inserção de avaliações para usuários autenticados"
on public.video_ratings for insert to public
with check (auth.uid() = user_id);

create policy "Usuários podem inserir comentários em vídeos"
on public.video_ratings for insert to authenticated
with check (auth.uid() = user_id);

create policy "Permitir leitura de avaliações e comentários para todos"
on public.video_ratings for select to public
using (true);

create policy "Todos podem ler os comentários"
on public.video_ratings for select to public
using (true);

create policy "Usuários podem inserir vídeos"
on public.videos for insert to authenticated
with check (auth.uid() = user_id);
