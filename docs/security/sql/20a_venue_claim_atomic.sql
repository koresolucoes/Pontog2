-- Step 20A: atomic venue claim decision + canonical ownership assignment.
-- Service-role only. Approval never silently transfers an already-owned venue.

create or replace function public.process_venue_claim(
  p_claim_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_claim public.venue_claims%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_existing_owner uuid;
begin
  if p_claim_id is null or v_action not in ('approve', 'reject') then
    raise exception 'invalid claim action';
  end if;

  select * into v_claim
  from public.venue_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'claim not found';
  end if;

  if v_claim.status <> 'pending' then
    raise exception 'claim already decided';
  end if;

  if v_action = 'reject' then
    update public.venue_claims
    set status = 'rejected',
        reviewed_at = now(),
        updated_at = now()
    where id = v_claim.id;

    return jsonb_build_object(
      'claim_id', v_claim.id,
      'venue_id', v_claim.venue_id,
      'user_id', v_claim.user_id,
      'status', 'rejected'
    );
  end if;

  select owner_id into v_existing_owner
  from public.venues
  where id = v_claim.venue_id
  for update;

  if not found then
    raise exception 'venue not found';
  end if;

  if v_existing_owner is not null and v_existing_owner is distinct from v_claim.user_id then
    raise exception 'venue already owned by another user';
  end if;

  update public.venues
  set owner_id = v_claim.user_id
  where id = v_claim.venue_id;

  update public.profiles
  set is_owner = true
  where id = v_claim.user_id;

  update public.venue_claims
  set status = 'approved',
      reviewed_at = now(),
      updated_at = now()
  where id = v_claim.id;

  update public.venue_claims
  set status = 'rejected',
      reviewed_at = now(),
      updated_at = now()
  where venue_id = v_claim.venue_id
    and id <> v_claim.id
    and status = 'pending';

  perform public.ensure_b2b_wallet(v_claim.user_id, v_claim.venue_id);

  return jsonb_build_object(
    'claim_id', v_claim.id,
    'venue_id', v_claim.venue_id,
    'user_id', v_claim.user_id,
    'status', 'approved'
  );
end;
$$;

revoke all on function public.process_venue_claim(uuid, text) from public, anon, authenticated;
grant execute on function public.process_venue_claim(uuid, text) to service_role;
