create table public.inbox_activity_read_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  winks_seen_at timestamptz not null default to_timestamp(0),
  profile_views_seen_at timestamptz not null default to_timestamp(0),
  updated_at timestamptz not null default now()
);

alter table public.inbox_activity_read_state enable row level security;

revoke all on table public.inbox_activity_read_state from public, anon, authenticated;
grant select on table public.inbox_activity_read_state to authenticated;

create policy inbox_activity_read_state_select_own
on public.inbox_activity_read_state
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.get_inbox_activity_unread_v1()
returns table(winks_unread bigint, profile_views_unread bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_winks_seen_at timestamptz := to_timestamp(0);
  v_profile_views_seen_at timestamptz := to_timestamp(0);
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select s.winks_seen_at, s.profile_views_seen_at
    into v_winks_seen_at, v_profile_views_seen_at
  from public.inbox_activity_read_state s
  where s.user_id = v_uid;

  v_winks_seen_at := coalesce(v_winks_seen_at, to_timestamp(0));
  v_profile_views_seen_at := coalesce(v_profile_views_seen_at, to_timestamp(0));

  return query
  select
    (
      select count(*)
      from public.winks w
      join public.profiles p on p.id = w.sender_id
      where w.receiver_id = v_uid
        and w.created_at > v_winks_seen_at
        and p.status = 'active'
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = v_uid and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_uid)
        )
    )::bigint,
    (
      select count(*)
      from public.profile_views pv
      join public.profiles p on p.id = pv.viewer_id
      where pv.viewed_id = v_uid
        and pv.viewed_at > v_profile_views_seen_at
        and p.status = 'active'
        and coalesce(p.is_incognito, false) = false
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = v_uid and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_uid)
        )
    )::bigint;
end;
$$;

create or replace function public.mark_inbox_activity_seen_v1(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_seen_at timestamptz;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_kind not in ('winks', 'profile_views') then
    raise exception 'invalid_activity_kind' using errcode = '22023';
  end if;

  if p_kind = 'winks' then
    select coalesce(max(w.created_at), now())
      into v_seen_at
    from public.winks w
    where w.receiver_id = v_uid;

    insert into public.inbox_activity_read_state(user_id, winks_seen_at, profile_views_seen_at, updated_at)
    values (v_uid, v_seen_at, to_timestamp(0), now())
    on conflict (user_id) do update
      set winks_seen_at = greatest(public.inbox_activity_read_state.winks_seen_at, excluded.winks_seen_at),
          updated_at = now();
  else
    select coalesce(max(pv.viewed_at), now())
      into v_seen_at
    from public.profile_views pv
    where pv.viewed_id = v_uid;

    insert into public.inbox_activity_read_state(user_id, winks_seen_at, profile_views_seen_at, updated_at)
    values (v_uid, to_timestamp(0), v_seen_at, now())
    on conflict (user_id) do update
      set profile_views_seen_at = greatest(public.inbox_activity_read_state.profile_views_seen_at, excluded.profile_views_seen_at),
          updated_at = now();
  end if;

  return jsonb_build_object('kind', p_kind, 'seen_at', v_seen_at);
end;
$$;

revoke all on function public.get_inbox_activity_unread_v1() from public, anon;
revoke all on function public.mark_inbox_activity_seen_v1(text) from public, anon;
grant execute on function public.get_inbox_activity_unread_v1() to authenticated;
grant execute on function public.mark_inbox_activity_seen_v1(text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inbox_activity_read_state'
  ) then
    alter publication supabase_realtime add table public.inbox_activity_read_state;
  end if;
end
$$;
