-- Step 02B — Payments Data API hardening
-- Server webhook uses service_role; clients keep only authenticated own-payment SELECT.

begin;

revoke all privileges on table public.payments from anon;
revoke insert, update, delete, truncate, references, trigger on table public.payments from authenticated;
grant select on table public.payments to authenticated;
grant select, insert, update, delete on table public.payments to service_role;

drop policy if exists "Permitir inserção via serviço" on public.payments;
drop policy if exists "Users can view their own payments" on public.payments;
drop policy if exists "Usuários podem ver seus próprios pagamentos" on public.payments;

create policy "payments_select_own"
on public.payments
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
