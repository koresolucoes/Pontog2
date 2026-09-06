-- Rollback for Step 02B — restores prior permissive payment grants/policies.
-- WARNING: use only for emergency rollback.

begin;

grant all privileges on table public.payments to anon;
grant all privileges on table public.payments to authenticated;
grant all privileges on table public.payments to service_role;

drop policy if exists "payments_select_own" on public.payments;

create policy "Permitir inserção via serviço"
on public.payments
for insert
to public
with check (true);

create policy "Users can view their own payments"
on public.payments
for select
to public
using (auth.uid() = user_id);

create policy "Usuários podem ver seus próprios pagamentos"
on public.payments
for select
to public
using (auth.uid() = user_id);

commit;
