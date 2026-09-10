-- Enable the canonical account lifecycle guard for every Supabase Data API request.
-- Realtime and Storage are separate products and are handled in later C1 slices.

alter role authenticator
  set pgrst.db_pre_request = 'public.pontog_enforce_account_access';

notify pgrst, 'reload config';
