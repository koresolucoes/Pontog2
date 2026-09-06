-- Step 06 Financial Hardening — rollback procedure
-- IMPORTANT: never subtract balances or shorten subscriptions automatically.
-- Once any new settlement RPC has processed a real payment, preserve payment_effects
-- and provider_reference audit data so replay protection is not lost.

-- Safe application rollback:
-- 1. Revert the API/Payment Engine deployment to the previous green build only if
--    no new financial event has been processed, OR disable payment entrypoints.
-- 2. If events were processed, keep these DB objects and reconcile explicitly.
-- 3. Do NOT delete payment_effects rows, b2b_transactions, payments, or donations.

-- Before first production use only, the additive DB layer may be removed with:
-- drop function if exists public.settle_subscription_payment(text, text, uuid, text, numeric, text);
-- drop function if exists public.settle_wallet_topup(text, text, uuid, uuid, numeric, text);
-- drop function if exists public.settle_donation_payment(text, text, bigint, numeric, text);
-- drop index if exists public.b2b_transactions_actor_user_id_idx;
-- drop index if exists public.b2b_transactions_provider_reference_uidx;
-- alter table public.b2b_transactions drop column if exists actor_user_id;
-- alter table public.b2b_transactions drop column if exists provider_reference;
-- alter table public.b2b_transactions drop column if exists provider;
-- drop table if exists public.payment_effects;

-- After first production settlement, prefer a forward fix. Any financial correction
-- must be explicit, auditable, and based on provider reconciliation.
