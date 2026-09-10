create or replace function public.pg_admin_moderation_context(p_report_id bigint)
returns jsonb
language sql stable security definer
set search_path=''
as $$
with file_evidence as (
  select a.id::text as id,a.object_path,'report_evidence'::text as bucket,a.mime_type,a.size_bytes,a.created_at
  from public.report_evidence_attachments a where a.report_id=p_report_id
), chat_images as (
  select ('chat-'||ce.id::text) as id,ce.image_path_snapshot as object_path,'user_uploads'::text as bucket,'image/chat'::text as mime_type,0::bigint as size_bytes,ce.sent_at as created_at
  from public.report_chat_evidence ce
  where ce.report_id=p_report_id and ce.image_path_snapshot is not null
), all_files as (
  select * from file_evidence union all select * from chat_images
)
select jsonb_build_object(
  'content_state',coalesce((select m.state from private.moderation_content_state m where m.target_type=r.target_type and m.target_id=r.target_id),'visible'),
  'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'object_path',f.object_path,'bucket',f.bucket,'mime_type',f.mime_type,'size_bytes',f.size_bytes,'created_at',f.created_at) order by f.created_at) from all_files f),'[]'::jsonb),
  'chat_evidence',coalesce((select jsonb_agg(jsonb_build_object('id',ce.id,'source_message_id',ce.source_message_id,'sender_id',ce.sender_id,'sent_at',ce.sent_at,'content',ce.content_snapshot,'image_path',ce.image_path_snapshot,'is_view_once',ce.is_view_once,'captured_at',ce.captured_at) order by ce.sent_at) from public.report_chat_evidence ce where ce.report_id=r.id),'[]'::jsonb)
 ) from public.reports r where r.id=p_report_id;
$$;
revoke all on function public.pg_admin_moderation_context(bigint) from public,anon,authenticated;
grant execute on function public.pg_admin_moderation_context(bigint) to service_role;

create or replace function public.report_attach_chat_evidence_v1(p_report_id bigint,p_message_ids bigint[])
returns integer
language plpgsql security definer
set search_path='pg_catalog','public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid(); v_report public.reports%rowtype; v_conversation_id bigint; v_count integer; v_unique_count integer; v_excerpt text;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not private.current_user_session_allowed() then raise exception 'session_not_allowed' using errcode='42501'; end if;
  if p_report_id is null then raise exception 'report_required' using errcode='22023'; end if;
  if p_message_ids is null or cardinality(p_message_ids)<1 or cardinality(p_message_ids)>12 then raise exception 'select_between_1_and_12_messages' using errcode='22023'; end if;
  select * into v_report from public.reports r where r.id=p_report_id and r.reporter_id=v_uid and r.status in ('open','reviewing');
  if not found then raise exception 'report_not_available' using errcode='42501'; end if;
  select count(distinct x) into v_unique_count from unnest(p_message_ids) x;
  if v_unique_count<>cardinality(p_message_ids) then raise exception 'duplicate_message_ids' using errcode='22023'; end if;
  select min(m.conversation_id),count(*) into v_conversation_id,v_count from public.messages m where m.id=any(p_message_ids);
  if v_count<>cardinality(p_message_ids) then raise exception 'message_not_found' using errcode='P0002'; end if;
  if exists(select 1 from public.messages m where m.id=any(p_message_ids) and m.conversation_id<>v_conversation_id) then raise exception 'messages_must_share_conversation' using errcode='22023'; end if;
  if not exists(select 1 from public.conversation_participants cp where cp.conversation_id=v_conversation_id and cp.user_id=v_uid)
     or not exists(select 1 from public.conversation_participants cp where cp.conversation_id=v_conversation_id and cp.user_id=v_report.reported_id)
     or (select count(*) from public.conversation_participants cp where cp.conversation_id=v_conversation_id)<>2 then raise exception 'conversation_not_eligible' using errcode='42501'; end if;

  insert into public.report_chat_evidence(report_id,reporter_id,conversation_id,source_message_id,sender_id,sent_at,content_snapshot,image_path_snapshot,is_view_once)
  select v_report.id,v_uid,m.conversation_id,m.id,m.sender_id,m.created_at,left(m.content,4000),m.image_url,coalesce(m.is_view_once,false)
  from public.messages m where m.id=any(p_message_ids)
  on conflict(report_id,source_message_id) do nothing;
  get diagnostics v_count=row_count;

  select string_agg(case when ce.sender_id=v_uid then 'Denunciante: ' else 'Denunciado: ' end || coalesce(nullif(left(ce.content_snapshot,500),''),case when ce.image_path_snapshot is not null then '[Imagem]' else '[Mídia]' end),E'\n' order by ce.sent_at)
  into v_excerpt from public.report_chat_evidence ce where ce.report_id=p_report_id;
  update public.reports r set evidence=jsonb_set(jsonb_set(coalesce(r.evidence,'{}'::jsonb),'{chat_excerpt}',to_jsonb(left(coalesce(v_excerpt,''),4000)),true),'{chat_message_count}',to_jsonb((select count(*) from public.report_chat_evidence ce where ce.report_id=p_report_id)),true),updated_at=now() where r.id=p_report_id;
  return v_count;
end;
$$;
revoke all on function public.report_attach_chat_evidence_v1(bigint,bigint[]) from public,anon;
grant execute on function public.report_attach_chat_evidence_v1(bigint,bigint[]) to authenticated;
notify pgrst,'reload schema';