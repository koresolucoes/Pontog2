create or replace function public.pg_admin_trust_safety_metrics()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
with active_reports as (
  select r.id,r.reported_id,r.severity,r.created_at
  from public.reports r
  where r.status in ('open','reviewing')
), repeat_subjects as (
  select r.reported_id
  from public.reports r
  where r.created_at >= now()-interval '90 days'
    and r.status in ('open','reviewing','resolved')
  group by r.reported_id
  having count(*) >= 3
)
select jsonb_build_object(
  'open_reports',(select count(*) from active_reports),
  'critical_open',(select count(*) from active_reports where severity='critical'),
  'sla_breached',(select count(*) from active_reports where (severity in ('critical','high') and created_at < now()-interval '4 hours') or (severity not in ('critical','high') and created_at < now()-interval '24 hours')),
  'oldest_open_minutes',coalesce((select floor(extract(epoch from (now()-min(created_at)))/60)::bigint from active_reports),0),
  'pending_appeals',(select count(*) from public.account_appeals where status in ('pending','in_review')),
  'repeat_subjects_90d',(select count(*) from repeat_subjects),
  'open_support',(select count(*) from public.pg_support_tickets where status not in ('resolved','closed')),
  'generated_at',now()
);
$$;
revoke all on function public.pg_admin_trust_safety_metrics() from public,anon,authenticated;
grant execute on function public.pg_admin_trust_safety_metrics() to service_role;
notify pgrst,'reload schema';