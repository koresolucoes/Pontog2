create index if not exists hidden_profiles_hidden_id_idx
  on public.hidden_profiles(hidden_id);

create index if not exists report_chat_evidence_reporter_idx
  on public.report_chat_evidence(reporter_id, captured_at desc);

drop policy if exists report_chat_evidence_no_direct_user_access on public.report_chat_evidence;
create policy report_chat_evidence_no_direct_user_access
on public.report_chat_evidence
as restrictive
for all
to authenticated
using (false)
with check (false);

revoke all on public.report_chat_evidence from anon, authenticated;
grant select,insert,update,delete on public.report_chat_evidence to service_role;
