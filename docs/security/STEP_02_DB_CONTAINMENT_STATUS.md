# Step 02 — DB Containment Status

Date: 2026-09-05
Parent: #5 / #1
Architecture: #14

## Applied to production Supabase

### 02A — privileged admin RPC
Migration: `security_step_02a_close_admin_rpc`

- `get_all_users_for_admin()` EXECUTE revoked from `PUBLIC`, `anon`, `authenticated`.
- `service_role` EXECUTE preserved.
- Verified: anon=false, authenticated=false, service_role=true.

### 02B — payments
Migration: `security_step_02b_payments_hardening`

- anon: no table privileges on `payments`.
- authenticated: SELECT only.
- mutation reserved to backend/service role.
- duplicate/permissive INSERT/SELECT policies removed.
- canonical policy: `payments_select_own` with `(select auth.uid()) = user_id`.
- Verified: anon SELECT/INSERT=false; authenticated SELECT=true, INSERT=false.

### 02C — B2B anonymous containment
Migration: `security_step_02c_b2b_anon_containment`

- anon: no access to `b2b_wallets`.
- anon: no access to `b2b_transactions`.
- anon: `b2b_campaigns` SELECT retained for compatibility; mutation revoked.
- authenticated privileges intentionally not narrowed yet.

## B2B integrity finding

Current model is not ready for owner-scoped RLS:

- 719 wallet rows / 719 distinct venue IDs.
- 317 wallets reference a currently existing venue.
- 0 referenced venues have `owner_id` populated.
- all 317 current venues have `owner_id = null`.
- 4 campaign rows exist; none reference a currently existing venue.

Therefore `venue.owner_id = auth.uid()` policies would currently lock out legitimate flows and leave orphaned records unresolved.

## Architectural decision

Do not invent authorization from broken ownership data.

Before authenticated B2B lockdown:
1. define canonical Venue ownership in the Venues/Partnerships module;
2. reconcile wallet venue IDs;
3. reconcile campaign venue IDs;
4. backfill owner relationships from approved venue claims where trustworthy;
5. only then replace permissive authenticated policies with owner-scoped contracts.

## Rollback

Every production migration in this step has a matching SQL rollback file under `docs/security/sql/`.

## Next

- Step 01 PR #18 remains blocked only on production admin bootstrap/env proof.
- Step 02D: B2B ownership/data integrity repair plan.
- Step 03 can be audited/prepared in parallel, but Storage changes must remain separate from DB containment.
