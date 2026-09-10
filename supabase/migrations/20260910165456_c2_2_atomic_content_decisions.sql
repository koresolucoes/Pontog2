alter table private.moderation_decisions add column if not exists content_action text not null default 'none' check (content_action in ('none','hide','remove','restore'));

create or replace function public.pg_admin_moderation_decide_v2(
  p_report_id bigint,p_reviewer_id uuid,p_idempotency_key uuid,p_decision text,
  p_account_action text default 'none',p_content_action text default 'none',
  p_suspend_until timestamptz default null,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_existing private.moderation_decisions%rowtype; v_report public.reports%rowtype;
 v_decision text:=lower(btrim(coalesce(p_decision,''))); v_account text:=lower(btrim(coalesce(p_account_action,'none')));
 v_content text:=lower(btrim(coalesce(p_content_action,'none'))); v_notes text:=nullif(btrim(coalesce(p_notes,'')),'');
 v_state text; v_result jsonb;
begin
 if p_report_id is null or p_reviewer_id is null or p_idempotency_key is null then raise exception 'invalid_request'; end if;
 if v_decision not in ('reviewing','resolved','dismissed') then raise exception 'invalid_decision'; end if;
 if v_account not in ('none','suspend','ban') then raise exception 'invalid_account_action'; end if;
 if v_content not in ('none','hide','remove','restore') then raise exception 'invalid_content_action'; end if;
 if v_decision='reviewing' and (v_account<>'none' or v_content not in ('none','hide')) then raise exception 'invalid_reviewing_action'; end if;
 if v_decision='dismissed' and (v_account<>'none' or v_content not in ('none','restore')) then raise exception 'invalid_dismissed_action'; end if;
 if v_decision='resolved' and v_content='restore' then raise exception 'invalid_resolved_action'; end if;
 if v_decision in ('resolved','dismissed') and (v_notes is null or char_length(v_notes)<3) then raise exception 'resolution_reason_required'; end if;
 if v_notes is not null and char_length(v_notes)>4000 then raise exception 'notes_too_long'; end if;
 if v_account='suspend' and (p_suspend_until is null or p_suspend_until<=now()) then raise exception 'future_suspend_until_required'; end if;

 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 select * into v_existing from private.moderation_decisions where idempotency_key=p_idempotency_key;
 if found then
   if v_existing.report_id<>p_report_id or v_existing.reviewer_id<>p_reviewer_id then raise exception 'idempotency_key_conflict'; end if;
   return v_existing.result||jsonb_build_object('replayed',true);
 end if;

 select * into v_report from public.reports where id=p_report_id for update;
 if not found then raise exception 'report_not_found'; end if;
 if v_report.status in ('resolved','dismissed') then raise exception 'report_already_terminal'; end if;
 if v_report.target_type='user' and v_content<>'none' then raise exception 'content_action_not_applicable'; end if;

 if v_content<>'none' then
   v_state:=case v_content when 'hide' then 'hidden' when 'remove' then 'removed' else 'visible' end;
   perform public.pg_admin_set_content_moderation(v_report.target_type,v_report.target_id,v_state,p_reviewer_id,p_report_id,coalesce(v_notes,'Em análise'),v_report.evidence);
 end if;

 if v_decision='reviewing' then
   update public.reports set status='reviewing',review_started_at=coalesce(review_started_at,now()),reviewed_by=p_reviewer_id::text,updated_at=now() where id=p_report_id;
 else
   if v_account='suspend' then perform public.pg_admin_set_user_state(v_report.reported_id,'suspended'::public.profile_status,p_suspend_until);
   elsif v_account='ban' then perform public.pg_admin_set_user_state(v_report.reported_id,'banned'::public.profile_status,null); end if;
   update public.reports set status=v_decision,reviewed_at=now(),reviewed_by=p_reviewer_id::text,resolution_notes=v_notes,updated_at=now(),review_started_at=coalesce(review_started_at,now()) where id=p_report_id;
 end if;

 v_result:=jsonb_build_object('report_id',p_report_id,'decision',v_decision,'account_action',v_account,'content_action',v_content,'reported_id',v_report.reported_id,'target_type',v_report.target_type,'target_id',v_report.target_id,'suspend_until',case when v_account='suspend' then p_suspend_until else null end,'replayed',false);
 insert into private.moderation_decisions(idempotency_key,report_id,reviewer_id,decision,account_action,content_action,suspend_until,notes,result)
 values(p_idempotency_key,p_report_id,p_reviewer_id,v_decision,v_account,v_content,case when v_account='suspend' then p_suspend_until else null end,v_notes,v_result);
 return v_result;
end;$$;
revoke all on function public.pg_admin_moderation_decide_v2(bigint,uuid,uuid,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.pg_admin_moderation_decide_v2(bigint,uuid,uuid,text,text,text,timestamptz,text) to service_role;

create or replace function public.pg_admin_moderation_context(p_report_id bigint)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
   'content_state',coalesce((select m.state from private.moderation_content_state m where m.target_type=r.target_type and m.target_id=r.target_id),'visible'),
   'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'object_path',a.object_path,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'created_at',a.created_at) order by a.created_at) from public.report_evidence_attachments a where a.report_id=r.id),'[]'::jsonb)
 ) from public.reports r where r.id=p_report_id;
$$;
revoke all on function public.pg_admin_moderation_context(bigint) from public,anon,authenticated;
grant execute on function public.pg_admin_moderation_context(bigint) to service_role;

create or replace function public.report_content_v1(p_target_type text,p_target_id text,p_reason text,p_comments text default null)
returns bigint language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid(); v_type text:=lower(btrim(coalesce(p_target_type,''))); v_target text:=btrim(coalesce(p_target_id,''));
 v_reason public.report_reason; v_severity text; v_author uuid; v_evidence jsonb:='{}'::jsonb; v_bigint bigint; v_integer integer; v_uuid uuid; v_id bigint;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if not private.current_user_session_allowed() then raise exception 'session_not_active'; end if;
 if not private.is_profile_active(v_actor) then raise exception 'account_not_active'; end if;
 if p_comments is not null and char_length(p_comments)>2000 then raise exception 'comments_too_long'; end if;
 if v_type not in ('agora_post','agora_comment','video','video_comment','community','community_post','community_comment','venue_review','venue_review_reply') then raise exception 'unsupported_target_type'; end if;
 begin v_reason:=p_reason::public.report_reason; exception when invalid_text_representation then raise exception 'invalid_reason'; end;
 v_severity:=case v_reason::text when 'underage' then 'critical' when 'harassment' then 'high' when 'impersonation' then 'high' when 'scam_or_fraud' then 'high' when 'spam' then 'low' else 'medium' end;
 if not private.moderation_content_visible(v_type,v_target) then raise exception 'target_not_found_or_not_visible'; end if;

 if v_type='agora_post' then begin v_bigint:=v_target::bigint; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select p.user_id,p.id::text,jsonb_build_object('excerpt',left(coalesce(p.status_text,''),500),'has_media',p.photo_url is not null,'created_at',p.created_at) into v_author,v_target,v_evidence from public.agora_posts p where p.id=v_bigint;
 elsif v_type='agora_comment' then begin v_bigint:=v_target::bigint; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select c.user_id,c.id::text,jsonb_build_object('excerpt',left(coalesce(c.content,''),500),'post_id',c.post_id,'created_at',c.created_at) into v_author,v_target,v_evidence from public.agora_post_comments c where c.id=v_bigint and private.moderation_content_visible('agora_post',c.post_id::text);
 elsif v_type='video' then begin v_integer:=v_target::integer; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select v.user_id,v.id::text,jsonb_build_object('title',left(coalesce(v.title,''),200),'excerpt',left(coalesce(v.description,''),500),'created_at',v.created_at) into v_author,v_target,v_evidence from public.videos v where v.id=v_integer;
 elsif v_type='video_comment' then begin v_bigint:=v_target::bigint; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select c.user_id,c.id::text,jsonb_build_object('excerpt',left(coalesce(c.comment,''),500),'video_id',c.video_id,'created_at',c.created_at) into v_author,v_target,v_evidence from public.video_comments c where c.id=v_bigint and private.moderation_content_visible('video',c.video_id::text);
 elsif v_type='community' then begin v_uuid:=v_target::uuid; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select c.creator_id,c.id::text,jsonb_build_object('name',left(coalesce(c.name,''),200),'excerpt',left(coalesce(c.description,''),500),'is_private',c.is_private,'created_at',c.created_at) into v_author,v_target,v_evidence from public.communities c where c.id=v_uuid and (not coalesce(c.is_private,false) or c.creator_id=v_actor or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=v_actor));
 elsif v_type='community_post' then begin v_uuid:=v_target::uuid; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select p.author_id,p.id::text,jsonb_build_object('excerpt',left(coalesce(p.content,''),500),'community_id',p.community_id,'has_media',p.image_url is not null,'created_at',p.created_at) into v_author,v_target,v_evidence from public.community_posts p join public.communities c on c.id=p.community_id where p.id=v_uuid and private.moderation_content_visible('community',c.id::text) and (not coalesce(c.is_private,false) or c.creator_id=v_actor or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=v_actor));
 elsif v_type='community_comment' then begin v_uuid:=v_target::uuid; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select cc.author_id,cc.id::text,jsonb_build_object('excerpt',left(coalesce(cc.content,''),500),'post_id',cc.post_id,'community_id',cp.community_id,'created_at',cc.created_at) into v_author,v_target,v_evidence from public.community_comments cc join public.community_posts cp on cp.id=cc.post_id join public.communities c on c.id=cp.community_id where cc.id=v_uuid and private.moderation_content_visible('community_post',cp.id::text) and private.moderation_content_visible('community',c.id::text) and (not coalesce(c.is_private,false) or c.creator_id=v_actor or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=v_actor));
 elsif v_type='venue_review' then begin v_uuid:=v_target::uuid; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select r.user_id,r.id::text,jsonb_build_object('excerpt',left(coalesce(r.comment,''),500),'venue_id',r.venue_id,'created_at',r.created_at) into v_author,v_target,v_evidence from public.venue_reviews r where r.id=v_uuid;
 elsif v_type='venue_review_reply' then begin v_uuid:=v_target::uuid; exception when invalid_text_representation then raise exception 'invalid_target'; end;
   select r.user_id,r.id::text,jsonb_build_object('excerpt',left(coalesce(r.comment,''),500),'review_id',r.review_id,'created_at',r.created_at) into v_author,v_target,v_evidence from public.venue_review_replies r where r.id=v_uuid and private.moderation_content_visible('venue_review',r.review_id::text);
 end if;
 if v_author is null then raise exception 'target_not_found_or_not_visible'; end if;
 if v_author=v_actor then raise exception 'cannot_report_own_content'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_author) then raise exception 'target_author_not_found'; end if;
 insert into public.reports(reporter_id,reported_id,reason,comments,target_type,target_id,severity,evidence) values(v_actor,v_author,v_reason,nullif(btrim(p_comments),''),v_type,v_target,v_severity,v_evidence||jsonb_build_object('author_id',v_author)) returning id into v_id;
 return v_id;
exception when unique_violation then raise exception 'already_reported';
end;$$;
revoke all on function public.report_content_v1(text,text,text,text) from public,anon;
grant execute on function public.report_content_v1(text,text,text,text) to authenticated,service_role;
notify pgrst,'reload schema';