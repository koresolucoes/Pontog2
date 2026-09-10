create or replace function public.pg_admin_moderation_context(p_report_id bigint)
returns jsonb
language sql stable security definer
set search_path=''
as $$
 select jsonb_build_object(
   'content_state',coalesce((select m.state from private.moderation_content_state m where m.target_type=r.target_type and m.target_id=r.target_id),'visible'),
   'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'object_path',a.object_path,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'created_at',a.created_at) order by a.created_at) from public.report_evidence_attachments a where a.report_id=r.id),'[]'::jsonb),
   'chat_evidence',coalesce((select jsonb_agg(jsonb_build_object('id',ce.id,'source_message_id',ce.source_message_id,'sender_id',ce.sender_id,'sent_at',ce.sent_at,'content',ce.content_snapshot,'image_path',ce.image_path_snapshot,'is_view_once',ce.is_view_once,'captured_at',ce.captured_at) order by ce.sent_at) from public.report_chat_evidence ce where ce.report_id=r.id),'[]'::jsonb)
 ) from public.reports r where r.id=p_report_id;
$$;
revoke all on function public.pg_admin_moderation_context(bigint) from public,anon,authenticated;
grant execute on function public.pg_admin_moderation_context(bigint) to service_role;
notify pgrst,'reload schema';