revoke insert on public.pg_support_tickets from authenticated;
revoke insert on public.pg_support_messages from authenticated;

create or replace function public.create_my_support_ticket_v1(p_subject text,p_category text,p_body text)
returns table(ticket_id uuid,ticket_number bigint)
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid(); v_subject text:=btrim(coalesce(p_subject,'')); v_category text:=lower(btrim(coalesce(p_category,'other'))); v_body text:=btrim(coalesce(p_body,'')); v_ticket public.pg_support_tickets%rowtype;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if not private.current_session_not_revoked() then raise exception 'session_not_active'; end if;
 if char_length(v_subject)<3 or char_length(v_subject)>180 then raise exception 'invalid_subject'; end if;
 if v_category not in ('account','safety','billing','partner','bug','other') then raise exception 'invalid_category'; end if;
 if char_length(v_body)<1 or char_length(v_body)>10000 then raise exception 'invalid_message'; end if;
 if (select count(*) from public.pg_support_tickets t where t.requester_id=v_actor and t.status not in ('resolved','closed'))>=5 then raise exception 'too_many_open_tickets'; end if;
 if (select count(*) from public.pg_support_tickets t where t.requester_id=v_actor and t.created_at>now()-interval '1 hour')>=5 then raise exception 'support_rate_limited'; end if;
 insert into public.pg_support_tickets(requester_id,subject,category,priority,status,tags,source)
 values(v_actor,v_subject,v_category,'normal','new','{}'::text[],'app') returning * into v_ticket;
 insert into public.pg_support_messages(ticket_id,author_type,author_user_id,body,internal_note)
 values(v_ticket.id,'user',v_actor,v_body,false);
 return query select v_ticket.id,v_ticket.number;
end;$$;
revoke all on function public.create_my_support_ticket_v1(text,text,text) from public,anon;
grant execute on function public.create_my_support_ticket_v1(text,text,text) to authenticated,service_role;

create or replace function public.get_my_support_tickets_v1()
returns table(id uuid,number bigint,subject text,category text,priority text,status text,created_at timestamptz,updated_at timestamptz,last_message_at timestamptz,resolved_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select t.id,t.number,t.subject,t.category,t.priority,t.status,t.created_at,t.updated_at,t.last_message_at,t.resolved_at
 from public.pg_support_tickets t where t.requester_id=auth.uid()
 order by t.last_message_at desc limit 100;
$$;
revoke all on function public.get_my_support_tickets_v1() from public,anon;
grant execute on function public.get_my_support_tickets_v1() to authenticated,service_role;

create or replace function public.get_my_support_messages_v1(p_ticket_id uuid)
returns table(id uuid,ticket_id uuid,author_type text,body text,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if not private.current_session_not_revoked() then raise exception 'session_not_active'; end if;
 if not exists(select 1 from public.pg_support_tickets t where t.id=p_ticket_id and t.requester_id=auth.uid()) then raise exception 'ticket_not_found'; end if;
 return query select m.id,m.ticket_id,m.author_type,m.body,m.created_at from public.pg_support_messages m where m.ticket_id=p_ticket_id and m.internal_note=false order by m.created_at asc limit 500;
end;$$;
revoke all on function public.get_my_support_messages_v1(uuid) from public,anon;
grant execute on function public.get_my_support_messages_v1(uuid) to authenticated,service_role;

create or replace function public.send_my_support_message_v1(p_ticket_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_body text:=btrim(coalesce(p_body,'')); v_id uuid; v_status text;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if not private.current_session_not_revoked() then raise exception 'session_not_active'; end if;
 if char_length(v_body)<1 or char_length(v_body)>10000 then raise exception 'invalid_message'; end if;
 select t.status into v_status from public.pg_support_tickets t where t.id=p_ticket_id and t.requester_id=v_actor;
 if not found then raise exception 'ticket_not_found'; end if;
 if v_status='closed' then raise exception 'ticket_closed'; end if;
 if (select count(*) from public.pg_support_messages m where m.author_user_id=v_actor and m.created_at>now()-interval '1 minute')>=12 then raise exception 'message_rate_limited'; end if;
 insert into public.pg_support_messages(ticket_id,author_type,author_user_id,body,internal_note)
 values(p_ticket_id,'user',v_actor,v_body,false) returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.send_my_support_message_v1(uuid,text) from public,anon;
grant execute on function public.send_my_support_message_v1(uuid,text) to authenticated,service_role;

notify pgrst,'reload schema';