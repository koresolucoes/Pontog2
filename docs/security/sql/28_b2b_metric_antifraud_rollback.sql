-- Step 07E rollback — restore the pre-antifraud metric RPC and remove only its private ledger.

create or replace function public.increment_b2b_campaign_metric(
  p_campaign_id uuid,
  p_metric text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_metric = 'view' then
    update public.b2b_campaigns
    set views_count = views_count + 1
    where id = p_campaign_id and status = 'approved';
  elsif p_metric = 'click' then
    update public.b2b_campaigns
    set clicks_count = clicks_count + 1
    where id = p_campaign_id and status = 'approved';
  else
    raise exception 'invalid campaign metric';
  end if;
end;
$$;

revoke all on function public.increment_b2b_campaign_metric(uuid, text) from public, anon;
grant execute on function public.increment_b2b_campaign_metric(uuid, text) to authenticated;

drop table if exists private.b2b_campaign_metric_events;
