-- Step 04E — Safe authenticated public profile projection
-- Additive contract. Existing frontend consumers are not switched yet.

begin;

create or replace function public.get_public_profile_v1(p_profile_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  public_photos text[],
  video_url text,
  status_text text,
  age integer,
  position text,
  relationship_status text,
  body_type text,
  gender_identity text,
  pronouns text,
  sexual_orientation text,
  looking_for text[],
  interests text[],
  can_host boolean,
  is_verified boolean,
  subscription_tier text,
  has_private_albums boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.public_photos,
    p.video_url,
    p.status_text::text,
    case
      when p.date_of_birth is null then null
      else extract(year from age(current_date, p.date_of_birth))::integer
    end as age,
    p.position,
    coalesce(p.relationship_status, p.status_relacionamento) as relationship_status,
    p.tipo_corpo as body_type,
    p.gender_identity,
    p.pronouns,
    p.sexual_orientation,
    p.looking_for,
    p.interests,
    p.can_host,
    coalesce(p.is_verified, false) as is_verified,
    p.subscription_tier::text,
    p.has_private_albums
  from public.profiles p
  where p.id = p_profile_id
    and (
      p.id = v_actor_id
      or (
        p.status::text = 'active'
        and not p.is_incognito
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = v_actor_id and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_actor_id)
        )
        and (
          coalesce(p.visibility, 'todos') = 'todos'
          or exists (
            select 1
            from public.profile_tribes target_pt
            join public.profile_tribes actor_pt
              on actor_pt.tribe_id = target_pt.tribe_id
            where target_pt.profile_id = p.id
              and actor_pt.profile_id = v_actor_id
          )
        )
      )
    );
end;
$function$;

revoke execute on function public.get_public_profile_v1(uuid) from public;
revoke execute on function public.get_public_profile_v1(uuid) from anon;
grant execute on function public.get_public_profile_v1(uuid) to authenticated;
grant execute on function public.get_public_profile_v1(uuid) to service_role;

commit;
