alter table public.venue_checkins
  drop constraint if exists venue_checkins_venue_id_user_id_key;

comment on index public.venue_checkins_one_active_per_user_idx is
  'Permite histórico e retornos ao mesmo local; garante somente um check-in ativo por usuário.';
