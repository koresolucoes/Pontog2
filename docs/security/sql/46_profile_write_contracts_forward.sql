-- Backend finalization — explicit write contracts for profile-owned state.
-- Additive: direct legacy table grants are revoked only in the later cutover migration.

create or replace function public.set_my_incognito_v1(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_tier text;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select p.subscription_tier::text
    into v_tier
  from public.profiles p
  where p.id = v_uid and p.status::text = 'active';

  if not found then
    raise exception 'profile_not_active' using errcode = '42501';
  end if;

  if coalesce(p_enabled, false) and v_tier <> 'plus' then
    raise exception 'plus_required' using errcode = '42501';
  end if;

  update public.profiles
  set is_incognito = coalesce(p_enabled, false), updated_at = now()
  where id = v_uid;

  return coalesce(p_enabled, false);
end;
$function$;

revoke all on function public.set_my_incognito_v1(boolean) from public, anon;
grant execute on function public.set_my_incognito_v1(boolean) to authenticated;

create or replace function public.update_my_profile_v1(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_key text;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_profile_patch' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key <> all (array[
      'username','display_name','avatar_url','date_of_birth','height_cm','weight_kg',
      'status_text','position','hiv_status','public_photos','status_relacionamento',
      'tipo_corpo','etnia','habitos_fumo','habitos_bebida','redes_sociais','kinks',
      'can_host','video_url','gender_identity','pronouns','sexual_orientation',
      'relationship_status','looking_for','interests','tribes_configured','visibility',
      'oral_preference','accommodation_preference','has_completed_onboarding','has_seen_tour'
    ]) then
      raise exception 'profile_field_not_editable:%', v_key using errcode = '42501';
    end if;
  end loop;

  update public.profiles p
  set
    username = case when p_patch ? 'username' then nullif(btrim(p_patch->>'username'), '') else p.username end,
    display_name = case when p_patch ? 'display_name' then nullif(btrim(p_patch->>'display_name'), '') else p.display_name end,
    avatar_url = case when p_patch ? 'avatar_url' then p_patch->>'avatar_url' else p.avatar_url end,
    date_of_birth = case when p_patch ? 'date_of_birth' then (p_patch->>'date_of_birth')::date else p.date_of_birth end,
    height_cm = case when p_patch ? 'height_cm' then (p_patch->>'height_cm')::smallint else p.height_cm end,
    weight_kg = case when p_patch ? 'weight_kg' then (p_patch->>'weight_kg')::smallint else p.weight_kg end,
    status_text = case when p_patch ? 'status_text' then p_patch->>'status_text' else p.status_text end,
    position = case when p_patch ? 'position' then p_patch->>'position' else p.position end,
    hiv_status = case when p_patch ? 'hiv_status' then p_patch->>'hiv_status' else p.hiv_status end,
    public_photos = case when p_patch ? 'public_photos' then
      case when jsonb_typeof(p_patch->'public_photos') = 'array'
        then array(select jsonb_array_elements_text(p_patch->'public_photos'))
        else '{}'::text[] end
      else p.public_photos end,
    status_relacionamento = case when p_patch ? 'status_relacionamento' then p_patch->>'status_relacionamento' else p.status_relacionamento end,
    tipo_corpo = case when p_patch ? 'tipo_corpo' then p_patch->>'tipo_corpo' else p.tipo_corpo end,
    etnia = case when p_patch ? 'etnia' then p_patch->>'etnia' else p.etnia end,
    habitos_fumo = case when p_patch ? 'habitos_fumo' then p_patch->>'habitos_fumo' else p.habitos_fumo end,
    habitos_bebida = case when p_patch ? 'habitos_bebida' then p_patch->>'habitos_bebida' else p.habitos_bebida end,
    redes_sociais = case when p_patch ? 'redes_sociais' then p_patch->'redes_sociais' else p.redes_sociais end,
    kinks = case when p_patch ? 'kinks' then
      case when jsonb_typeof(p_patch->'kinks') = 'array'
        then array(select jsonb_array_elements_text(p_patch->'kinks'))
        else '{}'::text[] end
      else p.kinks end,
    can_host = case when p_patch ? 'can_host' then (p_patch->>'can_host')::boolean else p.can_host end,
    video_url = case when p_patch ? 'video_url' then p_patch->>'video_url' else p.video_url end,
    gender_identity = case when p_patch ? 'gender_identity' then p_patch->>'gender_identity' else p.gender_identity end,
    pronouns = case when p_patch ? 'pronouns' then p_patch->>'pronouns' else p.pronouns end,
    sexual_orientation = case when p_patch ? 'sexual_orientation' then p_patch->>'sexual_orientation' else p.sexual_orientation end,
    relationship_status = case when p_patch ? 'relationship_status' then p_patch->>'relationship_status' else p.relationship_status end,
    looking_for = case when p_patch ? 'looking_for' then
      case when jsonb_typeof(p_patch->'looking_for') = 'array'
        then array(select jsonb_array_elements_text(p_patch->'looking_for'))
        else '{}'::text[] end
      else p.looking_for end,
    interests = case when p_patch ? 'interests' then
      case when jsonb_typeof(p_patch->'interests') = 'array'
        then array(select jsonb_array_elements_text(p_patch->'interests'))
        else '{}'::text[] end
      else p.interests end,
    tribes_configured = case when p_patch ? 'tribes_configured' then (p_patch->>'tribes_configured')::boolean else p.tribes_configured end,
    visibility = case when p_patch ? 'visibility' then p_patch->>'visibility' else p.visibility end,
    oral_preference = case when p_patch ? 'oral_preference' then p_patch->>'oral_preference' else p.oral_preference end,
    accommodation_preference = case when p_patch ? 'accommodation_preference' then p_patch->>'accommodation_preference' else p.accommodation_preference end,
    has_completed_onboarding = case when p_patch ? 'has_completed_onboarding' then (p_patch->>'has_completed_onboarding')::boolean else p.has_completed_onboarding end,
    has_seen_tour = case when p_patch ? 'has_seen_tour' then (p_patch->>'has_seen_tour')::boolean else p.has_seen_tour end,
    updated_at = now()
  where p.id = v_uid;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  return public.get_my_profile_v1();
end;
$function$;

revoke all on function public.update_my_profile_v1(jsonb) from public, anon;
grant execute on function public.update_my_profile_v1(jsonb) to authenticated;

create or replace function public.set_my_checkin_v1(p_venue_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_venue_name text;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from public.venue_checkins vc where vc.user_id = v_uid;

  if p_venue_id is null then
    update public.profiles
      set current_checkin_venue_id = null,
          current_checkin_venue_name = null,
          updated_at = now()
      where id = v_uid;

    return jsonb_build_object('venue_id', null, 'venue_name', null, 'checked_in_at', null);
  end if;

  select v.name into v_venue_name
  from public.venues v
  where v.id = p_venue_id and (v.is_verified = true or v.source_type = 'osm');

  if not found then
    raise exception 'venue_not_available' using errcode = '22023';
  end if;

  insert into public.venue_checkins (venue_id, user_id, created_at)
  values (p_venue_id::text, v_uid, v_now);

  update public.profiles
    set current_checkin_venue_id = p_venue_id,
        current_checkin_venue_name = v_venue_name,
        updated_at = now()
    where id = v_uid;

  return jsonb_build_object('venue_id', p_venue_id, 'venue_name', v_venue_name, 'checked_in_at', v_now);
end;
$function$;

revoke all on function public.set_my_checkin_v1(uuid) from public, anon;
grant execute on function public.set_my_checkin_v1(uuid) to authenticated;
