create or replace function private.sync_report_chat_excerpt()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_excerpt text;
begin
  select string_agg(case when ce.sender_id=ce.reporter_id then 'Denunciante: ' else 'Denunciado: ' end || coalesce(nullif(left(ce.content_snapshot,500),''),case when ce.image_path_snapshot is not null then '[Imagem]' else '[Mídia]' end),E'\n' order by ce.sent_at)
  into v_excerpt
  from public.report_chat_evidence ce where ce.report_id=new.report_id;
  update public.reports r
  set evidence=jsonb_set(coalesce(r.evidence,'{}'::jsonb),'{excerpt}',to_jsonb(left(coalesce(v_excerpt,''),4000)),true),updated_at=now()
  where r.id=new.report_id and r.target_type='user';
  return new;
end;
$$;
revoke all on function private.sync_report_chat_excerpt() from public,anon,authenticated;
drop trigger if exists report_chat_evidence_sync_excerpt on public.report_chat_evidence;
create trigger report_chat_evidence_sync_excerpt after insert on public.report_chat_evidence for each row execute function private.sync_report_chat_excerpt();