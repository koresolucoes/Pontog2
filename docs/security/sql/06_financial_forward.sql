-- Step 06 Financial Hardening — forward migration
-- Additive first: preserves all existing financial records and balances.

create table if not exists public.payment_effects (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_payment_id text not null,
  effect_type text not null check (effect_type in ('subscription', 'wallet_topup', 'donation')),
  actor_user_id uuid null references auth.users(id) on delete set null,
  target_reference text null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  constraint payment_effects_provider_payment_key unique (provider, provider_payment_id)
);

alter table public.payment_effects enable row level security;
revoke all on table public.payment_effects from public, anon, authenticated;
grant select, insert, update, delete on table public.payment_effects to service_role;

alter table public.b2b_transactions
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists actor_user_id uuid;

create unique index if not exists b2b_transactions_provider_reference_uidx
  on public.b2b_transactions (provider, provider_reference)
  where provider is not null and provider_reference is not null;

create index if not exists b2b_transactions_actor_user_id_idx
  on public.b2b_transactions (actor_user_id)
  where actor_user_id is not null;

create or replace function public.settle_subscription_payment(
  p_provider text,
  p_provider_payment_id text,
  p_user_id uuid,
  p_plan_id text,
  p_amount numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_effect_id uuid;
  v_plan_price numeric;
  v_months integer;
  v_expires_at timestamptz;
begin
  if p_provider is null or btrim(p_provider) = '' or p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider and provider payment id are required';
  end if;
  if upper(coalesce(p_currency, '')) <> 'BRL' then
    raise exception 'unsupported currency';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  select price, months_duration
    into v_plan_price, v_months
  from public.plans
  where plan_id = p_plan_id
    and is_active = true
  limit 1;

  if not found then
    raise exception 'plan not found or inactive';
  end if;

  if round(p_amount, 2) <> round(v_plan_price, 2) then
    raise exception 'payment amount does not match plan price';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found';
  end if;

  insert into public.payment_effects (
    provider, provider_payment_id, effect_type, actor_user_id,
    target_reference, amount, currency
  ) values (
    lower(p_provider), p_provider_payment_id, 'subscription', p_user_id,
    p_plan_id, round(p_amount, 2), upper(p_currency)
  )
  on conflict (provider, provider_payment_id) do nothing
  returning id into v_effect_id;

  if v_effect_id is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'already_processed');
  end if;

  insert into public.payments (
    mercadopago_id, user_id, plan_id, amount, status, updated_at
  ) values (
    p_provider_payment_id, p_user_id, p_plan_id, round(p_amount, 2), 'approved', now()
  )
  on conflict (mercadopago_id) do update set
    user_id = excluded.user_id,
    plan_id = excluded.plan_id,
    amount = excluded.amount,
    status = 'approved',
    updated_at = now();

  update public.profiles
  set subscription_tier = 'plus',
      subscription_expires_at = greatest(coalesce(subscription_expires_at, now()), now())
        + make_interval(months => v_months),
      updated_at = now()
  where id = p_user_id
  returning subscription_expires_at into v_expires_at;

  return jsonb_build_object(
    'status', 'processed',
    'effect', 'subscription',
    'subscription_expires_at', v_expires_at
  );
end;
$$;

create or replace function public.settle_wallet_topup(
  p_provider text,
  p_provider_payment_id text,
  p_wallet_id uuid,
  p_actor_user_id uuid,
  p_amount numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_effect_id uuid;
  v_wallet_currency text;
  v_new_balance numeric;
begin
  if p_provider is null or btrim(p_provider) = '' or p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider and provider payment id are required';
  end if;
  if upper(coalesce(p_currency, '')) <> 'BRL' then
    raise exception 'unsupported currency';
  end if;
  if p_amount is null or p_amount < 10 then
    raise exception 'wallet top-up below minimum amount';
  end if;

  select currency
    into v_wallet_currency
  from public.b2b_wallets
  where id = p_wallet_id
  for update;

  if not found then
    raise exception 'wallet not found';
  end if;
  if upper(coalesce(v_wallet_currency, '')) <> upper(p_currency) then
    raise exception 'wallet currency mismatch';
  end if;

  insert into public.payment_effects (
    provider, provider_payment_id, effect_type, actor_user_id,
    target_reference, amount, currency
  ) values (
    lower(p_provider), p_provider_payment_id, 'wallet_topup', p_actor_user_id,
    p_wallet_id::text, round(p_amount, 2), upper(p_currency)
  )
  on conflict (provider, provider_payment_id) do nothing
  returning id into v_effect_id;

  if v_effect_id is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'already_processed');
  end if;

  update public.b2b_wallets
  set balance = balance + round(p_amount, 2),
      updated_at = now()
  where id = p_wallet_id
  returning balance into v_new_balance;

  insert into public.b2b_transactions (
    wallet_id, amount, type, status, description,
    provider, provider_reference, actor_user_id
  ) values (
    p_wallet_id, round(p_amount, 2), 'credit_purchase', 'approved',
    'Recarga de Saldo B2B (Mercado Pago)',
    lower(p_provider), p_provider_payment_id, p_actor_user_id
  );

  return jsonb_build_object(
    'status', 'processed',
    'effect', 'wallet_topup',
    'balance', v_new_balance
  );
end;
$$;

create or replace function public.settle_donation_payment(
  p_provider text,
  p_provider_payment_id text,
  p_donation_id bigint,
  p_amount numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_effect_id uuid;
  v_expected_amount numeric;
  v_user_id uuid;
begin
  if p_provider is null or btrim(p_provider) = '' or p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider and provider payment id are required';
  end if;
  if upper(coalesce(p_currency, '')) <> 'BRL' then
    raise exception 'unsupported currency';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid donation amount';
  end if;

  select amount, user_id
    into v_expected_amount, v_user_id
  from public.donations
  where id = p_donation_id
  for update;

  if not found then
    raise exception 'donation not found';
  end if;
  if round(p_amount, 2) <> round(v_expected_amount, 2) then
    raise exception 'payment amount does not match donation';
  end if;

  insert into public.payment_effects (
    provider, provider_payment_id, effect_type, actor_user_id,
    target_reference, amount, currency
  ) values (
    lower(p_provider), p_provider_payment_id, 'donation', v_user_id,
    p_donation_id::text, round(p_amount, 2), upper(p_currency)
  )
  on conflict (provider, provider_payment_id) do nothing
  returning id into v_effect_id;

  if v_effect_id is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'already_processed');
  end if;

  update public.donations
  set status = 'approved',
      mercadopago_id = p_provider_payment_id,
      amount = round(p_amount, 2),
      updated_at = now()
  where id = p_donation_id;

  return jsonb_build_object('status', 'processed', 'effect', 'donation');
end;
$$;

revoke all on function public.settle_subscription_payment(text, text, uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.settle_wallet_topup(text, text, uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.settle_donation_payment(text, text, bigint, numeric, text) from public, anon, authenticated;

grant execute on function public.settle_subscription_payment(text, text, uuid, text, numeric, text) to service_role;
grant execute on function public.settle_wallet_topup(text, text, uuid, uuid, numeric, text) to service_role;
grant execute on function public.settle_donation_payment(text, text, bigint, numeric, text) to service_role;
