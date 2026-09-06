-- Step 07A.2 — Remove policies proven to be exact semantic duplicates.
-- No access rule is removed: one equivalent policy remains active for every dropped policy.

drop policy if exists "Allow read access to conversation participants" on public.conversations;

drop policy if exists "Inserção autenticada em venue_review_replies" on public.venue_review_replies;
drop policy if exists "Leitura pública de venue_review_replies" on public.venue_review_replies;

drop policy if exists "Inserção autenticada em venue_reviews" on public.venue_reviews;
drop policy if exists "Leitura pública de venue_reviews" on public.venue_reviews;

drop policy if exists "Qualquer um pode ver as curtidas dos vídeos" on public.video_likes;

drop policy if exists "Permitir exclusão de avaliações para donos do registro" on public.video_ratings;
drop policy if exists "Permitir inserção de avaliações para usuários autenticados" on public.video_ratings;
drop policy if exists "Usuários podem inserir comentários em vídeos" on public.video_ratings;
drop policy if exists "Permitir leitura de avaliações e comentários para todos" on public.video_ratings;
drop policy if exists "Todos podem ler os comentários" on public.video_ratings;

drop policy if exists "Usuários podem inserir vídeos" on public.videos;
