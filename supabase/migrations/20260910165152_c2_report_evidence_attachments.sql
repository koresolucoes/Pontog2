insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('report_evidence','report_evidence',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];

create table if not exists public.report_evidence_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id bigint not null references public.reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);
alter table public.report_evidence_attachments enable row level security;
revoke insert,update,delete on public.report_evidence_attachments from anon,authenticated;
grant select on public.report_evidence_attachments to authenticated;
create index if not exists report_evidence_report_created_idx on public.report_evidence_attachments(report_id,created_at);
create index if not exists report_evidence_reporter_created_idx on public.report_evidence_attachments(reporter_id,created_at desc);

drop policy if exists report_evidence_own_read on public.report_evidence_attachments;
create policy report_evidence_own_read on public.report_evidence_attachments for select to authenticated
using (reporter_id=(select auth.uid()));

drop policy if exists report_evidence_insert_own on storage.objects;
create policy report_evidence_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id='report_evidence'
  and split_part(name,'/',1)=(select auth.uid())::text
  and split_part(name,'/',2) ~ '^[0-9]+$'
  and exists(
    select 1 from public.reports r
    where r.id=split_part(name,'/',2)::bigint and r.reporter_id=(select auth.uid())
  )
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);

drop policy if exists report_evidence_select_own on storage.objects;
create policy report_evidence_select_own on storage.objects for select to authenticated
using (bucket_id='report_evidence' and split_part(name,'/',1)=(select auth.uid())::text);

create or replace function public.attach_report_evidence_v1(p_report_id bigint,p_object_path text)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_path text:=btrim(coalesce(p_object_path,''));
  v_object storage.objects%rowtype;
  v_mime text;
  v_size bigint;
  v_id uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.current_user_session_allowed() then raise exception 'session_not_active'; end if;
  if not exists(select 1 from public.reports r where r.id=p_report_id and r.reporter_id=v_actor) then raise exception 'report_not_found'; end if;
  if split_part(v_path,'/',1)<>v_actor::text or split_part(v_path,'/',2)<>p_report_id::text then raise exception 'invalid_evidence_path'; end if;
  if (select count(*) from public.report_evidence_attachments a where a.report_id=p_report_id)>=3 then raise exception 'evidence_limit_reached'; end if;

  select * into v_object from storage.objects o where o.bucket_id='report_evidence' and o.name=v_path;
  if not found then raise exception 'evidence_object_not_found'; end if;
  v_mime:=lower(coalesce(v_object.metadata->>'mimetype',''));
  v_size:=coalesce((v_object.metadata->>'size')::bigint,0);
  if v_mime not in ('image/jpeg','image/png','image/webp') then raise exception 'unsupported_evidence_type'; end if;
  if v_size<1 or v_size>5242880 then raise exception 'invalid_evidence_size'; end if;

  insert into public.report_evidence_attachments(report_id,reporter_id,object_path,mime_type,size_bytes)
  values(p_report_id,v_actor,v_path,v_mime,v_size)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  select a.id into v_id from public.report_evidence_attachments a where a.object_path=v_path and a.reporter_id=v_actor;
  if v_id is not null then return v_id; end if;
  raise;
end;$$;
revoke all on function public.attach_report_evidence_v1(bigint,text) from public,anon;
grant execute on function public.attach_report_evidence_v1(bigint,text) to authenticated,service_role;

notify pgrst,'reload schema';