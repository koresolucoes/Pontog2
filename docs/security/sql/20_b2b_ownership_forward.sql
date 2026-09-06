-- B2B ownership + financial integrity hardening.
-- Canonical owner: venues.owner_id. Claims only establish ownership after admin approval.

alter table public.b2b_campaigns
  add column if not exists cta_text text,
  add column if not exists cta_url text,
  add column if not exists views_count bigint not null default 0,
  add column if not exists clicks_count bigint not null default 0;

create unique index if not exists b2b_transactions_campaign_reference_uidx
  on public.b2b_transactions(reference_id)
  where type = 'campaign_deduction' and reference_id is not null;

create or replace function public.ensure_b2b_wallet(
  p_actor_user_id uuid,
  p_venue_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.b2b_wallets%rowtype;
  v_created boolean := false;
begin
  if p_actor_user_id is null or p_venue_id is null then
    raise exception 'actor and venue are required';
  end if;

  perform 1
  from public.venues
  where id = p_venue_id and owner_id = p_actor_user_id
  for update;

  if not found then
    raise exception 'venue is not owned by actor';
  end if;

  select * into v_wallet
  from public.b2b_wallets
  where venue_id = p_venue_id
  for update;

  if not found then
    insert into public.b2b_wallets(venue_id, balance, currency)
    values (p_venue_id, 100.00, 'BRL')
    returning * into v_wallet;
    v_created := true;

    insert into public.b2b_transactions(
      wallet_id, amount, type, status, description, actor_user_id
    ) values (
      v_wallet.id, 100.00, 'bonus_signup', 'approved',
      'Bônus de Boas-Vindas B2B', p_actor_user_id
    );
  end if;

  return jsonb_build_object(
    'id', v_wallet.id,
    'venue_id', v_wallet.venue_id,
    'balance', v_wallet.balance,
    'currency', v_wallet.currency,
    'created', v_created
  );
end;
$$;

create or replace function public.create_b2b_campaign_atomic(
  p_actor_user_id uuid,
  p_venue_id uuid,
  p_title text,
  p_message text,
  p_target_tribe text,
  p_placement text,
  p_duration_hours integer,
  p_range_meters integer,
  p_image_url text,
  p_cta_text text,
  p_cta_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.b2b_wallets%rowtype;
  v_campaign_id uuid;
  v_reach integer;
  v_cost numeric(12,2);
  v_balance numeric(12,2);
  v_duration integer;
  v_range integer;
  v_placement text;
begin
  if p_actor_user_id is null or p_venue_id is null then
    raise exception 'actor and venue are required';
  end if;
  if length(btrim(coalesce(p_title, ''))) < 2 or length(btrim(coalesce(p_title, ''))) > 120 then
    raise exception 'invalid campaign title';
  end if;
  if length(btrim(coalesce(p_message, ''))) < 2 or length(btrim(coalesce(p_message, ''))) > 1000 then
    raise exception 'invalid campaign message';
  end if;

  v_placement := lower(coalesce(p_placement, 'feed'));
  if v_placement not in ('push', 'feed', 'map', 'messages', 'banner') then
    raise exception 'invalid campaign placement';
  end if;

  v_duration := greatest(1, least(coalesce(p_duration_hours, 24), 168));
  v_range := greatest(100, least(coalesce(p_range_meters, 500), 50000));

  perform 1
  from public.venues
  where id = p_venue_id and owner_id = p_actor_user_id
  for update;
  if not found then
    raise exception 'venue is not owned by actor';
  end if;

  select * into v_wallet
  from public.b2b_wallets
  where venue_id = p_venue_id
  for update;

  if not found then
    perform public.ensure_b2b_wallet(p_actor_user_id, p_venue_id);
    select * into v_wallet
    from public.b2b_wallets
    where venue_id = p_venue_id
    for update;
  end if;

  if upper(coalesce(v_wallet.currency, '')) <> 'BRL' then
    raise exception 'unsupported wallet currency';
  end if;

  if v_placement = 'push' then
    v_reach := case
      when v_range <= 500 then 1500
      when v_range <= 2000 then 5000
      when v_range <= 5000 then 12000
      when v_range <= 15000 then 35000
      else 50000
    end;
    v_cost := round(v_reach * 0.10, 2);
  else
    v_reach := v_duration * case v_placement
      when 'map' then 300
      when 'messages' then 80
      when 'banner' then 150
      else 150
    end;
    v_cost := round(v_reach * 0.05, 2);
  end if;

  if v_wallet.balance < v_cost then
    raise exception 'insufficient wallet balance';
  end if;

  insert into public.b2b_campaigns(
    venue_id, title, message, target_tribe, range_meters,
    estimated_reach, cost, image_url, status, placement,
    duration_hours, cta_text, cta_url
  ) values (
    p_venue_id, btrim(p_title), btrim(p_message), coalesce(nullif(btrim(p_target_tribe), ''), 'Geral'),
    case when v_placement = 'push' then v_range else 0 end,
    v_reach, v_cost, nullif(btrim(coalesce(p_image_url, '')), ''),
    'approved', v_placement, v_duration,
    coalesce(nullif(btrim(coalesce(p_cta_text, '')), ''), 'Saiba Mais'),
    nullif(btrim(coalesce(p_cta_url, '')), '')
  ) returning id into v_campaign_id;

  update public.b2b_wallets
  set balance = balance - v_cost,
      updated_at = now()
  where id = v_wallet.id
  returning balance into v_balance;

  insert into public.b2b_transactions(
    wallet_id, amount, type, status, description,
    reference_id, actor_user_id
  ) values (
    v_wallet.id, -v_cost, 'campaign_deduction', 'approved',
    'Anúncio: ' || left(btrim(p_title), 120) || ' (' || v_placement || ')',
    v_campaign_id, p_actor_user_id
  );

  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'estimated_reach', v_reach,
    'cost', v_cost,
    'balance', v_balance
  );
end;
$$;

create or replace function public.set_b2b_campaign_status(
  p_actor_user_id uuid,
  p_campaign_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text := lower(coalesce(p_status, ''));
begin
  if v_status not in ('approved', 'paused') then
    raise exception 'invalid campaign status';
  end if;

  update public.b2b_campaigns c
  set status = v_status
  from public.venues v
  where c.id = p_campaign_id
    and v.id = c.venue_id
    and v.owner_id = p_actor_user_id;

  if not found then
    raise exception 'campaign is not owned by actor';
  end if;

  return v_status;
end;
$$;

create or replace function public.increment_b2b_campaign_metric(
  p_campaign_id uuid,
  p_metric text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_metric = 'view' then
    update public.b2b_campaigns
    set views_count = views_count + 1
    where id = p_campaign_id and status = 'approved';
  elsif p_metric = 'click' then
    update public.b2b_campaigns
    set clicks_count = clicks_count + 1
    where id = p_campaign_id and status = 'approved';
  else
    raise exception 'invalid campaign metric';
  end if;
end;
$$;

revoke all on function public.ensure_b2b_wallet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_b2b_campaign_atomic(uuid, uuid, text, text, text, text, integer, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.set_b2b_campaign_status(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.increment_b2b_campaign_metric(uuid, text) from public, anon;
grant execute on function public.ensure_b2b_wallet(uuid, uuid) to service_role;
grant execute on function public.create_b2b_campaign_atomic(uuid, uuid, text, text, text, text, integer, integer, text, text, text) to service_role;
grant execute on function public.set_b2b_campaign_status(uuid, uuid, text) to service_role;
grant execute on function public.increment_b2b_campaign_metric(uuid, text) to authenticated;

-- Replace broad B2B RLS with owner-scoped reads and backend-only writes.
drop policy if exists "Allow full access for administrators on wallets" on public.b2b_wallets;
drop policy if exists "Allow select for owners on their own wallets" on public.b2b_wallets;
create policy b2b_wallets_select_owner
on public.b2b_wallets for select to authenticated
using (exists (
  select 1 from public.venues v
  where v.id = b2b_wallets.venue_id
    and v.owner_id = (select auth.uid())
));

drop policy if exists "Allow insert/update for transactions" on public.b2b_transactions;
drop policy if exists "Allow read for transactions" on public.b2b_transactions;
create policy b2b_transactions_select_owner
on public.b2b_transactions for select to authenticated
using (exists (
  select 1
  from public.b2b_wallets w
  join public.venues v on v.id = w.venue_id
  where w.id = b2b_transactions.wallet_id
    and v.owner_id = (select auth.uid())
));

drop policy if exists "Allow full action on campaigns" on public.b2b_campaigns;
drop policy if exists "Allow read on campaigns" on public.b2b_campaigns;
create policy b2b_campaigns_select_public_approved
on public.b2b_campaigns for select to anon, authenticated
using (status = 'approved');
create policy b2b_campaigns_select_owner
on public.b2b_campaigns for select to authenticated
using (exists (
  select 1 from public.venues v
  where v.id = b2b_campaigns.venue_id
    and v.owner_id = (select auth.uid())
));

revoke insert, update, delete, truncate on public.b2b_wallets from anon, authenticated;
revoke insert, update, delete, truncate on public.b2b_transactions from anon, authenticated;
revoke insert, update, delete, truncate on public.b2b_campaigns from anon, authenticated;
revoke select on public.b2b_wallets, public.b2b_transactions from anon;
grant select on public.b2b_wallets, public.b2b_transactions to authenticated;
grant select on public.b2b_campaigns to anon, authenticated;

-- Claims: authenticated user can create/read only their own claim; no anonymous claim surface.
drop policy if exists "Donos podem criar reivindicações" on public.venue_claims;
drop policy if exists "Donos podem ver suas reivindicações" on public.venue_claims;
drop policy if exists "Usuários criam solicitações" on public.venue_claims;
drop policy if exists "Usuários veem suas próprias solicitações" on public.venue_claims;
create policy venue_claims_insert_own
on public.venue_claims for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.venues v
    where v.id = venue_claims.venue_id
      and (v.owner_id is null or v.owner_id = (select auth.uid()))
  )
);
create policy venue_claims_select_own
on public.venue_claims for select to authenticated
using (user_id = (select auth.uid()));
revoke all on public.venue_claims from anon;
revoke update, delete, truncate on public.venue_claims from authenticated;
grant select, insert on public.venue_claims to authenticated;

-- Remove the blanket venue SELECT; preserve verified/OSM/public and owner/submitted visibility.
drop policy if exists "Todos podem ler venues" on public.venues;
drop policy if exists "Public venues are viewable by everyone" on public.venues;
create policy venues_select_visible
on public.venues for select to anon, authenticated
using (
  is_verified = true
  or source_type = 'osm'
  or submitted_by = (select auth.uid())
  or owner_id = (select auth.uid())
);
